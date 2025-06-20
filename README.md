# Easy-Co (eco) - AWS EC2 Connection Manager

🚀 A simple and powerful CLI tool that simplifies AWS EC2 SSH connections. Manage your EC2 instances, store connection details, and connect with a single command!

## Features

✅ **Easy Connection Management**: Store and manage multiple EC2 connection details  
✅ **Native File Picker**: Select PEM files using macOS native file picker  
✅ **Security Validation**: Automatic PEM file permission checking  
✅ **Interactive CLI**: User-friendly prompts with validation  
✅ **Multiple Output Formats**: View connections in table or JSON format  
✅ **One-Command SSH**: Connect to EC2 instances with a single command  

## Installation

```bash
npm install -g easy-co
```

## Quick Start

1. **Add your first EC2 connection:**
   ```bash
   eco add
   ```

2. **List all connections:**
   ```bash
   eco ls
   ```

3. **Connect to an EC2 instance:**
   ```bash
   eco con <id>
   ```

## Commands

### `eco add`
Add a new EC2 connection interactively. The command will prompt you for:
- Connection name
- Description (optional)
- PEM file path (via native file picker)
- EC2 instance IP address

```bash
eco add
```

### `eco ls [options]`
List all saved connections

**Options:**
- `-f, --format <format>` - Output format: `table` (default) or `json`

```bash
eco ls                    # Display as table
eco ls --format json      # Display as JSON
```

### `eco con <id>`
Connect to an EC2 instance by connection ID

```bash
eco con 0    # Connect to connection with ID 0
```

### `eco remove <id>`
Remove a connection by ID

```bash
eco remove 0    # Remove connection with ID 0
```

### `eco --help`
Show help information

```bash
eco --help
```

## Example Usage

```bash
# Add a new EC2 connection
$ eco add
? Connection name: my-web-server
? Connection description (optional): Production web server
Opening file picker to select PEM file...
Selected file: /Users/username/.aws/my-key.pem
? Connection IP: 54.123.45.67
Connection added successfully:

┌────┬───────────────┬─────────────────────────┬──────────────┬─────────────────────────────┐
│ ID │ Name          │ Description             │ IP           │ PEM File Path               │
├────┼───────────────┼─────────────────────────┼──────────────┼─────────────────────────────┤
│ 0  │ my-web-server │ Production web server   │ 54.123.45.67 │ /Users/username/.aws/my-key.pem │
└────┴───────────────┴─────────────────────────┴──────────────┴─────────────────────────────┘

# List all connections
$ eco ls
┌────┬───────────────┬─────────────────────────┬──────────────┬─────────────────────────────┐
│ ID │ Name          │ Description             │ IP           │ PEM File Path               │
├────┼───────────────┼─────────────────────────┼──────────────┼─────────────────────────────┤
│ 0  │ my-web-server │ Production web server   │ 54.123.45.67 │ /Users/username/.aws/my-key.pem │
└────┴───────────────┴─────────────────────────┴──────────────┴─────────────────────────────┘

# Connect to an EC2 instance
$ eco con 0
# SSH connection to ec2-user@54.123.45.67 will be established
```

## Requirements

- **macOS**: Native file picker functionality requires macOS
- **SSH access**: SSH must be available on your system
- **Terminal permissions**: You may need to grant Terminal permission to control System Events for the file picker

## Security Features

- **PEM file validation**: Automatically checks if selected files have proper `.pem` extension
- **Permission checking**: Warns if PEM files don't have the recommended 600 permissions
- **IP validation**: Validates IP address format before saving
- **File existence check**: Verifies PEM files exist before saving connection

## Troubleshooting

### File Picker Issues
If the native file picker doesn't work:
1. Go to **System Preferences > Security & Privacy > Privacy > Automation**
2. Grant your terminal app permission to control **System Events**

### SSH Connection Issues
- Ensure your PEM file has correct permissions: `chmod 600 /path/to/your/key.pem`
- Verify the EC2 instance is running and accessible
- Check that the security group allows SSH access on port 22

## Technical Details

**Built with:**
- TypeScript
- Commander.js for CLI framework
- Inquirer.js for interactive prompts
- Node.js child_process for SSH connections
- Native macOS AppleScript for file picker
- Table formatting for display

**Data Storage:**
Connections are stored locally in a JSON file for persistence between sessions.

