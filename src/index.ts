#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../package.json';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { table } from 'table';
import 'colors';
import { spawn, exec } from 'child_process';
import inquirer from 'inquirer';

const program = new Command();

interface Connection {
  id: number;
  name: string;
  description: string;
  pemFilePath: string;
  ip: string;
}

// Get the correct path for connection.json file
const getConnectionFilePath = (): string => {
  // Place the JSON file in the user's home directory for both development and production
  const userHomeDir = os.homedir();
  return path.join(userHomeDir, '.eco', 'connection.json');
};

// utils
const showConnections = (connections: Connection[]) => {
  const tableData = [
    ['ID'.blue.bold, 'Name'.blue.bold, 'Description'.blue.bold, 'IP'.blue.bold, 'PEM File Path'.blue.bold],
    ...connections.map(connection => [connection.id, connection.name, connection.description, connection.ip, connection.pemFilePath]),
  ];
  console.log(table(tableData, {
    columns: {
      0: { alignment: 'left' },
      1: { alignment: 'left' },
      2: { alignment: 'left' },
      3: { alignment: 'left' },
      4: { alignment: 'left' },
    },
  }));
}

// Function to load and validate connections
const loadConnections = (): Connection[] | null => {
  const connectionFilePath = getConnectionFilePath();
  
  if (!fs.existsSync(connectionFilePath)) {
    console.log('No connections found. Use "eco add" to add your first connection.'.yellow);
    return null;
  }
  
  const connections: Connection[] = JSON.parse(fs.readFileSync(connectionFilePath, 'utf8'));
  
  if (connections.length === 0) {
    console.log('No connections found. Use "eco add" to add your first connection.'.yellow);
    return null;
  }
  
  return connections;
};

// Function to open native file picker
const openFilePicker = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const script = `choose file with prompt "Select PEM file"`;
    
    exec(`osascript -e '${script}'`, (error, stdout) => {
      if (error) {
        console.error('File picker error:', error);
        const altScript = `tell application "System Events" to choose file with prompt "Select PEM file"`;
        exec(`osascript -e '${altScript}'`, (altError, altStdout) => {
          if (altError) {
            console.error('Alternative file picker also failed:', altError);
            reject(altError);
            return;
          }
          const filePath = altStdout.trim();
          if (filePath) {
            resolve(filePath);
          } else {
            reject(new Error('No file selected'));
          }
        });
        return;
      }
      const filePath = stdout.trim();
      if (filePath) {
        const posixPath = filePath.replace(/:/g, "/").replace("alias Macintosh HD", "");
        resolve(posixPath);
      } else {
        reject(new Error('No file selected'));
      }
    });
  });
};

program
  .name('eco')
  .description('A simple CLI tool that simplifies connection of aws ec2 instances')
  .version(version);

// Add a create-user command
program
  .command('add')
  .description('Add a new ec2 connection data')
  .action(async () => {
    // Get name
    const nameAnswer = await inquirer.prompt([{
      type: 'input',
      name: 'name',
      message: 'Connection name:',
      validate: (input: string) => {
        if (input.trim() === '') {
          return 'Name is required';
        }
        return true;
      }
    }]);

    // Get description
    const descAnswer = await inquirer.prompt([{
      type: 'input',
      name: 'description',
      message: 'Connection description (optional):',
      default: ''
    }]);

    // Get PEM file path with native file picker
    console.log('Opening file picker to select PEM file...'.blue);
    console.log('Make sure you have granted Terminal/your app permission to control System Events'.yellow);
    let pemFilePath: string;
    try {
      pemFilePath = await openFilePicker();
      console.log('Selected file:', pemFilePath);
    } catch (error) {
      console.log('File selection was cancelled or failed:'.yellow, (error as Error).message);
      return;
    }
    
    // Validate PEM file path
    if (!pemFilePath || pemFilePath.trim() === '') {
      console.log('No PEM file selected.'.red);
      return;
    }
    
    if (!fs.existsSync(pemFilePath)) {
      console.log('Selected file does not exist.'.red);
      return;
    }

    // Check file extension
    if (!pemFilePath.toLowerCase().endsWith('.pem')) {
      console.log('Warning: Selected file does not have .pem extension.'.yellow);
      console.log('File path:', pemFilePath);
      const continueAnswer = await inquirer.prompt([{
        type: 'confirm',
        name: 'continue',
        message: 'Do you want to continue with this file?',
        default: false
      }]);
      
      if (!continueAnswer.continue) {
        console.log('File selection cancelled.'.yellow);
        return;
      }
    }

    // Check file permissions (should be 600 for PEM files)
    try {
      const stats = fs.statSync(pemFilePath);
      const mode = stats.mode & 0o777;
      if (mode !== 0o600) {
        console.log('Warning: PEM file should have 600 permissions for security.'.yellow);
        console.log('Current permissions:', mode.toString(8));
        console.log('You can fix this with: chmod 600', pemFilePath);
      }
    } catch (error) {
      console.log('Could not check file permissions.'.yellow);
    }

    // Get IP
    const ipAnswer = await inquirer.prompt([{
      type: 'input',
      name: 'ip',
      message: 'Connection IP:',
      validate: (input: string) => {
        if (input.trim() === '') {
          return 'IP address is required';
        }
        // Basic IP validation
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(input)) {
          return 'Please enter a valid IP address';
        }
        return true;
      }
    }]);

    try {
      const connectionFilePath = getConnectionFilePath();
      const ecoDir = path.dirname(connectionFilePath);
      
      // Create .eco directory if it doesn't exist
      if (!fs.existsSync(ecoDir)) {
        fs.mkdirSync(ecoDir, { recursive: true });
      }
      
      // Initialize empty array if file doesn't exist
      let connections: Connection[] = [];
      if (fs.existsSync(connectionFilePath)) {
        connections = JSON.parse(fs.readFileSync(connectionFilePath, 'utf8'));
      }
      
      const connection = {
        id: connections.length,
        name: nameAnswer.name,
        description: descAnswer.description,
        pemFilePath: pemFilePath,
        ip: ipAnswer.ip,
      };

      connections.push(connection);
      fs.writeFileSync(connectionFilePath, JSON.stringify(connections, null, 2));
      console.log('Connection added successfully:'.green);
      showConnections(connections);
    } catch (error) {
      console.error('Error adding connection:'.red, error);
    }
  });

program
  .command('ls')
  .description('List all connections')
  .option('-f, --format <format>', 'output format (json|table)', 'table')
  .action((options: { format?: string }) => {
    const connections = loadConnections();
    
    if (!connections) {
      return;
    }
    
    if (options.format === 'json') {
      console.log(JSON.stringify(connections, null, 2));
    } else {
      showConnections(connections);
    }
  });

program
  .command('remove <id>')
  .description('Remove a connection by ID')
  .action((id: string) => {
    const connections = loadConnections();
    
    if (!connections) {
      return;
    }
    
    const connectionId = parseInt(id);
    
    const connectionToRemove = connections.find(connection => connection.id === connectionId);
    if (!connectionToRemove) {
      console.log(`Connection with ID ${connectionId} not found.`.red);
      return;
    }
    
    const newConnections = connections.filter(connection => connection.id !== connectionId);
    const connectionFilePath = getConnectionFilePath();
    fs.writeFileSync(connectionFilePath, JSON.stringify(newConnections, null, 2));
    console.log(`Connection "${connectionToRemove.name}" (ID: ${connectionId}) removed successfully.`.green);
    
    if (newConnections.length > 0) {
      showConnections(newConnections);
    } else {
      console.log('No connections remaining.'.yellow);
    }
  });

program
  .command('con <id>')
  .description('Connect to a connection by ID')
  .action((id: string) => {
    const connections = loadConnections();
    
    if (!connections) {
      return;
    }
    
    const connectionId = parseInt(id);

    const connection = connections.find(connection => connection.id === connectionId);

    if (!connection) {
      console.log(`Connection with ID ${connectionId} not found.`.red);
      console.log('Use "eco ls" to see available connections.'.yellow);
      return;
    }

    const sshProcess = spawn('ssh', ['-t', '-i', connection.pemFilePath, `ec2-user@${connection.ip}`], {
      stdio: 'inherit',
      shell: true
    });

    sshProcess.on('error', (error) => {
      console.error(`Failed to start SSH connection: ${error.message}`.red);
    });

    sshProcess.on('exit', (code) => {
      if (code !== 0) {
        console.log(`SSH connection closed with code ${code}`.yellow);
      }
    });
  });

// Parse command line arguments
program.parse();