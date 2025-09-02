# README & Deployment Implementation

## Overview
This task creates comprehensive documentation, packaging configuration, and deployment strategies for the Google Calendar MCP server. It includes platform-specific installation instructions, Docker containerization, CI/CD pipelines, and production deployment guides.

## Dependencies
- Requires completion of Tasks 0001-0005 (all functionality implemented)
- Uses standard MCP packaging conventions
- Follows npm publishing best practices

## README.md Structure

```markdown
# Google Calendar MCP Server

A comprehensive Model Context Protocol server for Google Calendar integration, providing natural language scheduling, intelligent meeting management, and advanced calendar operations.

## Features

### 🗓️ Core Calendar Management
- List, create, update, and delete calendars
- Manage calendar settings and colors
- Subscribe to public calendars
- Calendar sharing and permissions

### 📅 Event Operations
- Natural language event creation
- Attendee management and RSVP tracking
- Reminder configuration
- Event search and filtering
- Conference/video call integration

### 🔄 Recurring Events
- Complex recurrence patterns (RRULE)
- Exception handling
- Series modifications
- Instance management

### 🤖 Intelligent Scheduling
- Free/busy queries across calendars
- Automatic conflict detection
- Meeting time suggestions
- Working hours consideration
- Multi-attendee coordination

### 📊 Dynamic Resources
- Real-time calendar status
- Upcoming events context
- Recent modifications tracking
- Shared calendar information

### 💬 Interactive Prompts
- Guided meeting scheduling
- Daily agenda generation
- Time blocking workflows
- Conflict resolution

## Installation

### Quick Start with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

\`\`\`json
{
  "mcpServers": {
    "google-calendar": {
      "command": "npx",
      "args": ["-y", "@your-org/google-calendar-mcp"],
      "env": {
        "GCAL_CLIENT_ID": "your_client_id",
        "GCAL_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
\`\`\`

### Installation Methods

#### NPM Global Install
\`\`\`bash
npm install -g @your-org/google-calendar-mcp

# Run the server
google-calendar-mcp
\`\`\`

#### NPX (No Install)
\`\`\`bash
npx @your-org/google-calendar-mcp
\`\`\`

#### From Source
\`\`\`bash
git clone https://github.com/your-org/google-calendar-mcp.git
cd google-calendar-mcp
npm install
npm run build
npm start
\`\`\`

#### Docker
\`\`\`bash
docker run -it \
  -e GCAL_CLIENT_ID=your_client_id \
  -e GCAL_CLIENT_SECRET=your_client_secret \
  -v ~/.config/gcal-mcp:/config \
  your-org/google-calendar-mcp
\`\`\`

## Configuration

### Authentication Setup

#### Option 1: OAuth2 (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth2 credentials:
   - Application type: Desktop
   - Download credentials JSON
5. Set environment variables:

\`\`\`bash
export GCAL_CLIENT_ID="your_client_id.apps.googleusercontent.com"
export GCAL_CLIENT_SECRET="your_client_secret"
export GCAL_REDIRECT_URI="http://localhost:3000/oauth2callback"
\`\`\`

#### Option 2: Service Account

1. Create a service account in Google Cloud Console
2. Download the key file
3. Set environment variable:

\`\`\`bash
export GCAL_SERVICE_ACCOUNT_KEY="/path/to/service-account-key.json"
export GCAL_IMPERSONATE_EMAIL="user@example.com"  # Optional
\`\`\`

#### Option 3: API Key (Limited - Public Calendars Only)

\`\`\`bash
export GCAL_API_KEY="your_api_key"
\`\`\`

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GCAL_CLIENT_ID` | OAuth2 client ID | Yes* | - |
| `GCAL_CLIENT_SECRET` | OAuth2 client secret | Yes* | - |
| `GCAL_SERVICE_ACCOUNT_KEY` | Service account key path | Yes* | - |
| `GCAL_API_KEY` | API key for public calendars | Yes* | - |
| `GCAL_TOKEN_PATH` | Token storage location | No | ~/.config/gcal-mcp/tokens |
| `GCAL_DEFAULT_CALENDAR` | Default calendar ID | No | primary |
| `GCAL_DEFAULT_TIMEZONE` | Default timezone | No | System timezone |
| `GCAL_CACHE_ENABLED` | Enable caching | No | true |
| `GCAL_LOG_LEVEL` | Logging level | No | info |

*At least one authentication method required

## Usage Examples

### Natural Language Event Creation
\`\`\`
"Schedule a meeting with Sarah tomorrow at 2pm"
"Block 2 hours for deep work next Monday morning"
"Set up a weekly team sync every Friday at 10am"
\`\`\`

### Finding Meeting Times
\`\`\`
"Find a time when John, Sarah, and I are all free this week"
"What's my next available 30-minute slot?"
"Show me free time tomorrow afternoon"
\`\`\`

### Calendar Management
\`\`\`
"Share my project calendar with the team"
"Create a new calendar for personal events"
"Show me all calendars I have access to"
\`\`\`

## Available Tools

### Calendar Management
- `gcal_list_calendars` - List all calendars
- `gcal_get_calendar` - Get calendar details
- `gcal_create_calendar` - Create new calendar
- `gcal_update_calendar` - Update calendar properties
- `gcal_delete_calendar` - Delete calendar
- `gcal_share_calendar` - Share calendar with users

### Event Operations
- `gcal_list_events` - List calendar events
- `gcal_get_event` - Get event details
- `gcal_create_event` - Create new event
- `gcal_quick_add` - Natural language event creation
- `gcal_update_event` - Update event
- `gcal_delete_event` - Delete event
- `gcal_move_event` - Move event between calendars

### Advanced Features
- `gcal_check_availability` - Check free/busy times
- `gcal_find_meeting_time` - Find optimal meeting slots
- `gcal_create_recurring_event` - Create recurring events
- `gcal_detect_conflicts` - Check for scheduling conflicts
- `gcal_add_conference` - Add video conferencing

### Full Tool List
See [TOOLS.md](docs/TOOLS.md) for complete documentation of all 35+ tools.

## Resources

The server provides dynamic resources that give LLMs context about your calendar:

- `calendar://recent-events` - Recently modified events
- `calendar://upcoming-events` - Events in the next 7 days
- `calendar://calendars-list` - Available calendars
- `calendar://free-busy-status` - Current availability
- `calendar://recurring-events` - Recurring event series
- `calendar://shared-calendars` - Shared calendar information

## Interactive Prompts

Pre-built workflows for common tasks:

- `schedule_meeting` - Guide through meeting scheduling
- `daily_agenda` - Get daily schedule summary
- `block_time` - Block focus time
- `manage_recurring` - Manage recurring events
- `find_free_time` - Find available time slots
- `calendar_permissions` - Manage sharing
- `conflict_resolver` - Resolve scheduling conflicts
- `weekly_summary` - Generate weekly summary

## Development

### Building from Source
\`\`\`bash
# Clone repository
git clone https://github.com/your-org/google-calendar-mcp.git
cd google-calendar-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Start development server
npm run dev
\`\`\`

### Testing
\`\`\`bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- calendar-management

# Integration tests
npm run test:integration
\`\`\`

### Project Structure
\`\`\`
google-calendar-mcp/
├── src/
│   ├── index.ts           # Main entry point
│   ├── server.ts          # MCP server setup
│   ├── auth/              # Authentication handlers
│   ├── tools/             # Tool implementations
│   ├── resources/         # Resource providers
│   ├── prompts/           # Interactive prompts
│   └── utils/             # Utilities
├── tests/                 # Test suites
├── docs/                  # Documentation
├── docker/                # Docker configuration
└── package.json          # Package configuration
\`\`\`

## Troubleshooting

### Authentication Issues

**"Invalid credentials" error**
- Verify your Client ID and Secret are correct
- Check that Calendar API is enabled in Google Cloud Console
- Ensure redirect URI matches configuration

**"Token expired" error**
- The server should auto-refresh tokens
- If persistent, delete token file and re-authenticate

### Permission Errors

**"Insufficient permissions" error**
- Check OAuth2 scopes include calendar access
- For service accounts, verify domain-wide delegation
- Ensure calendar is shared with service account email

### Rate Limiting

**"Rate limit exceeded" error**
- Server implements automatic retry with exponential backoff
- Reduce request frequency if persistent
- Check Google Cloud Console for quota usage

### Common Issues

See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for detailed solutions.

## Security

### Best Practices
- Never commit credentials to version control
- Use encrypted token storage
- Implement least-privilege access
- Rotate service account keys regularly
- Use OAuth2 over API keys when possible

### Token Storage
Tokens are encrypted using AES-256 and stored in:
- macOS/Linux: `~/.config/gcal-mcp/tokens`
- Windows: `%APPDATA%/gcal-mcp/tokens`

### Audit Logging
All calendar modifications are logged with:
- Timestamp
- User/service account
- Operation performed
- Affected resources

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Style
- TypeScript with strict mode
- ESLint configuration provided
- Prettier for formatting
- Conventional commits

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@your-org.com
- 💬 Discord: [Join our server](https://discord.gg/your-server)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/google-calendar-mcp/issues)
- 📖 Docs: [Full Documentation](https://docs.your-org.com/google-calendar-mcp)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

Built with ❤️ using the Model Context Protocol
```

## Package.json Configuration

```json
{
  "name": "@your-org/google-calendar-mcp",
  "version": "1.0.0",
  "description": "Google Calendar integration for Model Context Protocol with natural language scheduling",
  "keywords": [
    "mcp",
    "model-context-protocol",
    "google-calendar",
    "calendar",
    "scheduling",
    "ai",
    "llm"
  ],
  "homepage": "https://github.com/your-org/google-calendar-mcp",
  "bugs": {
    "url": "https://github.com/your-org/google-calendar-mcp/issues"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-org/google-calendar-mcp.git"
  },
  "license": "MIT",
  "author": "Your Organization",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "google-calendar-mcp": "dist/cli.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "dev": "tsx watch src/index.ts",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "prepublishOnly": "npm run clean && npm run build && npm run test",
    "semantic-release": "semantic-release",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@google-cloud/local-auth": "^3.0.1",
    "chrono-node": "^2.7.8",
    "dotenv": "^16.4.7",
    "google-auth-library": "^9.15.0",
    "googleapis": "^144.0.0",
    "luxon": "^3.5.0",
    "node-cache": "^5.1.2",
    "p-limit": "^6.1.0",
    "rrule": "^2.8.1",
    "winston": "^3.15.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/luxon": "^3.4.2",
    "@types/node": "^22.10.2",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "@vitest/coverage-v8": "^2.1.8",
    "eslint": "^9.0.0",
    "prettier": "^3.4.2",
    "semantic-release": "^24.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

## Docker Configuration

### Dockerfile
```dockerfile
# Multi-stage build for optimization
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install typescript @types/node

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001

# Copy built application
COPY --from=builder --chown=mcp:mcp /app/dist ./dist
COPY --from=builder --chown=mcp:mcp /app/node_modules ./node_modules
COPY --from=builder --chown=mcp:mcp /app/package*.json ./

# Create config directory
RUN mkdir -p /config && chown -R mcp:mcp /config

# Switch to non-root user
USER mcp

# Set environment
ENV NODE_ENV=production
ENV GCAL_TOKEN_PATH=/config/tokens

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').request('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).end()"

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start server
CMD ["node", "dist/index.js"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  google-calendar-mcp:
    build: .
    image: your-org/google-calendar-mcp:latest
    container_name: google-calendar-mcp
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GCAL_CLIENT_ID=${GCAL_CLIENT_ID}
      - GCAL_CLIENT_SECRET=${GCAL_CLIENT_SECRET}
      - GCAL_LOG_LEVEL=${GCAL_LOG_LEVEL:-info}
      - GCAL_CACHE_ENABLED=true
    volumes:
      - ./config:/config
      - ./logs:/app/logs
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  mcp-network:
    driver: bridge

volumes:
  config:
  logs:
```

## CI/CD Configuration

### GitHub Actions (.github/workflows/ci.yml)
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  release:
    types: [created]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Test
        run: npm run test:coverage
        env:
          GCAL_CLIENT_ID: ${{ secrets.TEST_CLIENT_ID }}
          GCAL_CLIENT_SECRET: ${{ secrets.TEST_CLIENT_SECRET }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  docker:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  publish-npm:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'release'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Platform-Specific Installers

### macOS (Homebrew Formula)
```ruby
class GoogleCalendarMcp < Formula
  desc "Google Calendar MCP server for AI assistants"
  homepage "https://github.com/your-org/google-calendar-mcp"
  url "https://registry.npmjs.org/@your-org/google-calendar-mcp/-/google-calendar-mcp-1.0.0.tgz"
  sha256 "YOUR_SHA256_HERE"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/google-calendar-mcp", "--version"
  end
end
```

### Windows (Chocolatey)
```xml
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2015/06/nuspec.xsd">
  <metadata>
    <id>google-calendar-mcp</id>
    <version>1.0.0</version>
    <title>Google Calendar MCP Server</title>
    <authors>Your Organization</authors>
    <projectUrl>https://github.com/your-org/google-calendar-mcp</projectUrl>
    <license>MIT</license>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
    <description>Google Calendar integration for Model Context Protocol</description>
    <tags>mcp calendar google ai llm</tags>
    <dependencies>
      <dependency id="nodejs" version="18.0.0" />
    </dependencies>
  </metadata>
  <files>
    <file src="tools\**" target="tools" />
  </files>
</package>
```

### Linux (Snap)
```yaml
name: google-calendar-mcp
version: '1.0.0'
summary: Google Calendar MCP server
description: |
  Google Calendar integration for Model Context Protocol
  with natural language scheduling and intelligent meeting management.

grade: stable
confinement: strict

base: core22

apps:
  google-calendar-mcp:
    command: bin/node $SNAP/lib/node_modules/@your-org/google-calendar-mcp/dist/index.js
    plugs:
      - network
      - network-bind
      - home

parts:
  google-calendar-mcp:
    plugin: npm
    source: .
    npm-node-version: 20.11.0
    build-packages:
      - build-essential
      - python3
    stage-packages:
      - libssl3
```

## Deployment Scripts

### install.sh (Unix-like systems)
```bash
#!/bin/bash

set -e

echo "🗓️ Google Calendar MCP Server Installer"
echo "======================================="

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     PLATFORM=linux;;
    Darwin*)    PLATFORM=macos;;
    CYGWIN*)    PLATFORM=windows;;
    MINGW*)     PLATFORM=windows;;
    *)          PLATFORM=unknown;;
esac

echo "Detected platform: ${PLATFORM}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required (found $(node -v))"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install package
echo "Installing Google Calendar MCP Server..."
npm install -g @your-org/google-calendar-mcp

# Create config directory
CONFIG_DIR="${HOME}/.config/gcal-mcp"
mkdir -p "${CONFIG_DIR}"
chmod 700 "${CONFIG_DIR}"

# Setup wizard
echo ""
echo "Configuration Setup"
echo "-------------------"
echo "Choose authentication method:"
echo "1) OAuth2 (recommended)"
echo "2) Service Account"
echo "3) API Key (limited)"

read -p "Selection (1-3): " AUTH_METHOD

case $AUTH_METHOD in
    1)
        read -p "Enter Client ID: " CLIENT_ID
        read -sp "Enter Client Secret: " CLIENT_SECRET
        echo ""
        
        cat > "${CONFIG_DIR}/env" << EOF
GCAL_CLIENT_ID=${CLIENT_ID}
GCAL_CLIENT_SECRET=${CLIENT_SECRET}
GCAL_REDIRECT_URI=http://localhost:3000/oauth2callback
EOF
        ;;
    2)
        read -p "Enter path to service account key file: " KEY_FILE
        read -p "Enter email to impersonate (optional): " IMPERSONATE
        
        cat > "${CONFIG_DIR}/env" << EOF
GCAL_SERVICE_ACCOUNT_KEY=${KEY_FILE}
GCAL_IMPERSONATE_EMAIL=${IMPERSONATE}
EOF
        ;;
    3)
        read -p "Enter API Key: " API_KEY
        
        cat > "${CONFIG_DIR}/env" << EOF
GCAL_API_KEY=${API_KEY}
EOF
        ;;
esac

chmod 600 "${CONFIG_DIR}/env"

echo ""
echo "✅ Installation complete!"
echo ""
echo "To use with Claude Desktop, add to your config:"
echo "~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
echo "Run 'google-calendar-mcp' to start the server"
```

### install.ps1 (Windows PowerShell)
```powershell
# Google Calendar MCP Server Installer for Windows

Write-Host "🗓️ Google Calendar MCP Server Installer" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    
    if ($majorVersion -lt 18) {
        Write-Host "❌ Node.js version 18+ required (found $nodeVersion)" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Install package
Write-Host "Installing Google Calendar MCP Server..." -ForegroundColor Yellow
npm install -g @your-org/google-calendar-mcp

# Create config directory
$configDir = "$env:APPDATA\gcal-mcp"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null

# Setup wizard
Write-Host ""
Write-Host "Configuration Setup" -ForegroundColor Cyan
Write-Host "-------------------" -ForegroundColor Cyan
Write-Host "Choose authentication method:"
Write-Host "1) OAuth2 (recommended)"
Write-Host "2) Service Account"
Write-Host "3) API Key (limited)"

$authMethod = Read-Host "Selection (1-3)"

$envContent = ""

switch ($authMethod) {
    "1" {
        $clientId = Read-Host "Enter Client ID"
        $clientSecret = Read-Host "Enter Client Secret" -AsSecureString
        $clientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
        )
        
        $envContent = @"
GCAL_CLIENT_ID=$clientId
GCAL_CLIENT_SECRET=$clientSecretPlain
GCAL_REDIRECT_URI=http://localhost:3000/oauth2callback
"@
    }
    "2" {
        $keyFile = Read-Host "Enter path to service account key file"
        $impersonate = Read-Host "Enter email to impersonate (optional)"
        
        $envContent = @"
GCAL_SERVICE_ACCOUNT_KEY=$keyFile
GCAL_IMPERSONATE_EMAIL=$impersonate
"@
    }
    "3" {
        $apiKey = Read-Host "Enter API Key"
        
        $envContent = @"
GCAL_API_KEY=$apiKey
"@
    }
}

# Save configuration
$envContent | Out-File -FilePath "$configDir\env" -Encoding UTF8

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To use with Claude Desktop, add to your config:" -ForegroundColor Yellow
Write-Host "%APPDATA%\Claude\claude_desktop_config.json" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run 'google-calendar-mcp' to start the server" -ForegroundColor Yellow
```

## Monitoring & Observability

### Health Check Endpoint
```typescript
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    authentication: authManager.isAuthenticated(),
    cache: {
      size: cacheManager.size(),
      hits: cacheManager.hits(),
      misses: cacheManager.misses(),
    },
  };
  
  res.json(health);
});
```

### Metrics Collection
```typescript
class MetricsCollector {
  private metrics = {
    requests: 0,
    errors: 0,
    latency: [],
    toolUsage: {},
    resourceReads: {},
  };
  
  trackRequest(tool: string, duration: number, success: boolean) {
    this.metrics.requests++;
    if (!success) this.metrics.errors++;
    this.metrics.latency.push(duration);
    this.metrics.toolUsage[tool] = (this.metrics.toolUsage[tool] || 0) + 1;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      avgLatency: this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length,
      errorRate: this.metrics.errors / this.metrics.requests,
    };
  }
}
```

## Production Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Dependencies updated
- [ ] Documentation complete
- [ ] Environment variables documented
- [ ] Docker image built and tested

### Deployment
- [ ] Backup existing configuration
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Monitor logs for errors
- [ ] Verify authentication works
- [ ] Test critical tools

### Post-Deployment
- [ ] Monitor metrics for 24 hours
- [ ] Check error rates
- [ ] Verify performance metrics
- [ ] Update status page
- [ ] Notify users of new features

## Success Criteria

### Documentation Requirements
- [ ] Complete README with all sections
- [ ] Installation guides for all platforms
- [ ] API documentation for all tools
- [ ] Troubleshooting guide
- [ ] Security best practices
- [ ] Contributing guidelines

### Packaging Requirements
- [ ] NPM package published
- [ ] Docker image available
- [ ] Platform installers created
- [ ] CI/CD pipeline configured
- [ ] Automated testing in place

### Deployment Requirements
- [ ] Health checks implemented
- [ ] Monitoring configured
- [ ] Logging structured
- [ ] Error tracking setup
- [ ] Performance metrics collected

## Deliverables

1. **Documentation Files**:
   - `README.md` - Main documentation
   - `docs/TOOLS.md` - Complete tool reference
   - `docs/TROUBLESHOOTING.md` - Common issues
   - `docs/SECURITY.md` - Security guide
   - `CONTRIBUTING.md` - Contribution guide
   - `CHANGELOG.md` - Version history

2. **Configuration Files**:
   - `package.json` - NPM package config
   - `Dockerfile` - Container image
   - `docker-compose.yml` - Container orchestration
   - `.github/workflows/` - CI/CD pipelines

3. **Installation Scripts**:
   - `scripts/install.sh` - Unix installer
   - `scripts/install.ps1` - Windows installer
   - Platform-specific packages

4. **Deployment Artifacts**:
   - NPM package
   - Docker images
   - Platform installers
   - Documentation site

This comprehensive deployment package ensures smooth installation and operation across all platforms.