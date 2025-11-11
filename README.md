# Google Calendar MCP Server

A Model Context Protocol (MCP) server that provides comprehensive Google Calendar integration for Claude Code and Claude Desktop. Manage calendars, create events with natural language, check availability, and handle permissions—all through a secure OAuth2 connection.

## Features

- **17 Calendar Management Tools** - Complete CRUD operations for calendars and events
- **Natural Language Event Creation** - Parse dates and times using natural language
- **Free/Busy Scheduling** - Check availability across multiple calendars
- **Calendar Sharing & ACL** - Manage calendar access control and permissions
- **Smart Scheduling** - Find optimal meeting times across attendees
- **Batch Operations** - Efficiently handle multiple calendar operations
- **Secure Token Storage** - OAuth2 tokens stored securely in `~/.config/mcp-gcal/`

## Prerequisites

Before installation, you'll need:

1. **Google Cloud Project** with Calendar API enabled
2. **OAuth2 Credentials** (Desktop application type)
3. **Node.js** 18 or higher

### Setting up Google Cloud Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API" and enable it
4. Create OAuth2 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as the application type
   - Download the credentials JSON file
5. Save the credentials file as `~/.config/mcp-gcal/credentials.json`

## Installation

### Claude Code (Recommended)

Install the MCP server with a single command:

```bash
npx -y @modelcontextprotocol/gcalendar-mcp auth
```

Then add to Claude Code:

```bash
claude mcp add gcalendar -- npx -y @modelcontextprotocol/gcalendar-mcp
```

### Claude Desktop

1. Install the package globally:
```bash
npm install -g @modelcontextprotocol/gcalendar-mcp
```

2. Add to your Claude Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gcalendar": {
      "command": "gcalendar-mcp"
    }
  }
}
```

## Authentication

Before first use, you must authenticate with Google:

```bash
# For Claude Code users
npx @modelcontextprotocol/gcalendar-mcp auth

# For global installation
gcalendar-mcp auth
```

This will:
1. Open your browser for Google account authentication
2. Request calendar permissions
3. Store the access token securely in `~/.config/mcp-gcal/`

**Note:** Authentication is required before first use. The browser will open automatically for Google account login.

## Available Tools

### Calendar Management
- `list-calendars` - List all accessible calendars
- `get-calendar` - Get details of a specific calendar
- `create-calendar` - Create a new calendar
- `update-calendar` - Update calendar properties
- `delete-calendar` - Delete a calendar (except primary)

### Event Operations
- `list-events` - List events with filtering options
- `get-event` - Get specific event details
- `create-event` - Create a new event
- `update-event` - Update existing event
- `delete-event` - Delete an event
- `gcal-quick-add-event` - Create events using natural language

### Advanced Features
- `gcal-freebusy-query` - Check availability across calendars
- `gcal-find-available-time` - Find optimal meeting slots
- `gcal-list-calendar-acl` - List calendar access control
- `gcal-create-calendar-acl` - Share calendar with users
- `gcal-update-calendar-acl` - Modify calendar permissions
- `gcal-delete-calendar-acl` - Revoke calendar access

## Usage Examples

Once installed, you can use natural language commands with Claude:

- "Check my calendar for tomorrow"
- "Schedule a meeting with John next Tuesday at 2pm"
- "Find a free 1-hour slot this week for a team meeting"
- "Share my work calendar with alice@example.com"
- "Create a recurring weekly standup every Monday at 9am"

## Configuration

### Environment Variables

- `GCAL_LOG_LEVEL` - Logging level: `error`, `warn`, `info`, `debug` (default: `info`)

### Token Management

OAuth2 tokens are stored securely and automatically refreshed. To reset authentication:

```bash
# Clear stored tokens
rm -rf ~/.config/mcp-gcal

# Re-authenticate
gcalendar-mcp auth
```

## Troubleshooting

### Authentication Issues

If you encounter authentication errors:
1. Ensure your OAuth2 credentials are for a "Desktop application"
2. Verify the Google Calendar API is enabled in your project
3. Clear tokens and re-authenticate: `rm -rf ~/.config/mcp-gcal && gcalendar-mcp auth`

### Permission Errors

If you see permission denied errors:
1. Check that your Google account has calendar access
2. Verify the OAuth2 consent screen includes Calendar scopes
3. Re-authenticate to refresh permissions

### Connection Issues

For connection problems:
1. Check your internet connection
2. Verify firewall settings allow HTTPS connections to Google APIs
3. Ensure Node.js version is 18 or higher: `node --version`

## Security

- OAuth2 tokens are stored locally in `~/.config/mcp-gcal/` with restricted permissions
- Credentials are never transmitted except to Google's OAuth2 servers
- All calendar operations use Google's secure API endpoints
- Token refresh is handled automatically and securely

## Development

To contribute or run locally:

```bash
# Clone the repository
git clone https://github.com/modelcontextprotocol/gcalendar-mcp.git
cd gcalendar-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run authentication
npm run auth

# Start the server
npm start
```

## License

MIT - See [LICENSE](LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/modelcontextprotocol/gcalendar-mcp/issues)
- **Documentation**: [MCP Protocol Docs](https://modelcontextprotocol.io)
- **Community**: [Discord Server](https://discord.gg/anthropic)

## Credits

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) by Anthropic.