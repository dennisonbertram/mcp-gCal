# Server Setup & Authentication Implementation

## Overview
This task establishes the foundation of the Google Calendar MCP server, implementing OAuth2 authentication with token management, server initialization, and core infrastructure including logging, error handling, and rate limiting.

**IMPLEMENTATION STATUS**: ✅ COMPLETE (Updated 2025-11-11)

**Current Implementation**: The server uses OAuth2 authentication following the mcp-gmail pattern with:
- Custom local auth helper with random port selection (50000-60000)
- Token storage in `~/.config/mcp-gcal/token.json` using "authorized_user" format
- Enhanced error handling and browser-based feedback
- Standalone CLI authentication script (`npm run auth`)
- Bundle distribution support for simplified deployment

## Dependencies
- No dependencies on other task documents
- This task must be completed before any other implementation tasks

## API Authentication Methods

### OAuth2 Flow (User Authentication)
- **Authorization URL**: `https://accounts.google.com/o/oauth2/v2/auth`
- **Token URL**: `https://oauth2.googleapis.com/token`
- **Scopes Required**:
  - `https://www.googleapis.com/auth/calendar` - Full calendar access
  - `https://www.googleapis.com/auth/calendar.events` - Event management
  - `https://www.googleapis.com/auth/calendar.readonly` - Read-only access
  - `https://www.googleapis.com/auth/calendar.settings.readonly` - Settings read
  - `https://www.googleapis.com/auth/calendar.addons.execute` - Add-on execution

### Service Account Authentication
- **Token URL**: `https://oauth2.googleapis.com/token`
- **Grant Type**: `urn:ietf:params:oauth:grant-type:jwt-bearer`
- **Impersonation**: Required for accessing user calendars
- **Key Format**: JSON key file from Google Cloud Console

### API Key (Limited Use)
- **Usage**: Public calendar read-only access
- **Header**: `X-goog-api-key: YOUR_API_KEY`
- **Limitations**: Cannot access private calendars or modify data

## Core Components to Implement

### 1. Authentication Manager
**Purpose**: Handle multiple authentication methods with automatic fallback

**Implementation**:
```typescript
interface AuthConfig {
  method: 'oauth2' | 'service_account' | 'api_key';
  oauth2?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    tokensPath: string;
  };
  serviceAccount?: {
    keyFile: string;
    impersonateEmail?: string;
  };
  apiKey?: string;
}

class AuthenticationManager {
  private config: AuthConfig;
  private tokenCache: Map<string, TokenData>;
  private oauth2Client?: OAuth2Client;
  private jwtClient?: JWT;

  async initialize(): Promise<void> {
    // Set up authentication based on available credentials
    // Priority: OAuth2 > Service Account > API Key
  }

  async getAuthClient(): Promise<OAuth2Client | JWT> {
    // Return authenticated client with valid tokens
    // Handle token refresh automatically
  }

  async refreshTokens(): Promise<void> {
    // Refresh expired tokens
    // Update token storage
  }

  async storeTokens(tokens: Credentials): Promise<void> {
    // Encrypt and store tokens securely
    // Use OS keychain when available
  }
}
```

### 2. MCP Server Foundation
**Purpose**: Initialize MCP server with Calendar-specific capabilities

**Implementation**:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

class GoogleCalendarMCPServer {
  private server: Server;
  private authManager: AuthenticationManager;
  private rateLimiter: RateLimiter;
  private logger: Winston.Logger;

  constructor() {
    this.server = new Server({
      name: 'google-calendar-mcp',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    });
  }

  async initialize(): Promise<void> {
    // Initialize authentication
    await this.authManager.initialize();
    
    // Register tools
    this.registerTools();
    
    // Register resources
    this.registerResources();
    
    // Register prompts
    this.registerPrompts();
    
    // Set up error handlers
    this.setupErrorHandlers();
  }

  private registerTools(): void {
    // Tool registration will be implemented in subsequent tasks
    // Placeholder for authentication check tool
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        // Apply rate limiting
        await this.rateLimiter.checkLimit(name);
        
        // Route to appropriate handler
        const result = await this.handleToolCall(name, args);
        
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        this.logger.error(`Tool call failed: ${name}`, error);
        throw error;
      }
    });
  }
}
```

### 3. Token Storage System
**Purpose**: Secure storage and management of authentication tokens

**Implementation**:
```typescript
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

class TokenStorage {
  private storePath: string;
  private encryptionKey: Buffer;

  constructor(storePath: string) {
    this.storePath = storePath;
    this.encryptionKey = this.deriveKey();
  }

  private deriveKey(): Buffer {
    // Derive encryption key from machine ID + user
    const machineId = process.env.MACHINE_ID || os.hostname();
    const userId = process.env.USER || 'default';
    return crypto.scryptSync(`${machineId}:${userId}`, 'salt', 32);
  }

  async storeTokens(accountId: string, tokens: any): Promise<void> {
    const encrypted = this.encrypt(JSON.stringify(tokens));
    const filePath = path.join(this.storePath, `${accountId}.token`);
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, encrypted, { mode: 0o600 });
  }

  async getTokens(accountId: string): Promise<any> {
    const filePath = path.join(this.storePath, `${accountId}.token`);
    
    try {
      const encrypted = await fs.readFile(filePath, 'utf-8');
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
  }
}
```

### 4. Rate Limiter
**Purpose**: Handle Google Calendar API rate limits gracefully

**Implementation**:
```typescript
class RateLimiter {
  private limits = {
    perSecond: 10,
    perMinute: 500,
    perDay: 1000000,
  };
  
  private counters = new Map<string, number[]>();
  
  async checkLimit(operation: string): Promise<void> {
    const now = Date.now();
    const key = `${operation}:${Math.floor(now / 1000)}`;
    
    // Check per-second limit
    const secondCount = this.getCount(key, 1000);
    if (secondCount >= this.limits.perSecond) {
      await this.delay(1000);
    }
    
    // Track request
    this.incrementCount(key);
  }
  
  async handleRateLimit(error: any): Promise<void> {
    if (error.code === 429) {
      const retryAfter = error.retryAfter || 60;
      await this.delay(retryAfter * 1000);
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 5. Logger Configuration
**Purpose**: Structured logging for debugging and monitoring

**Implementation**:
```typescript
import winston from 'winston';

function createLogger(): winston.Logger {
  return winston.createLogger({
    level: process.env.GCAL_LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
      new winston.transports.File({
        filename: process.env.GCAL_LOG_FILE || 'gcal-mcp.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });
}
```

## Testing Strategy

### Phase 1: API Authentication Testing
```bash
# Test OAuth2 flow
curl -X POST https://oauth2.googleapis.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "refresh_token=$REFRESH_TOKEN" \
  -d "grant_type=refresh_token" > oauth_response.json

# Test Service Account
curl -H "Authorization: Bearer $SERVICE_ACCOUNT_TOKEN" \
     "https://www.googleapis.com/calendar/v3/users/me/calendarList"

# Test API Key (public calendar only)
curl "https://www.googleapis.com/calendar/v3/calendars/holiday@group.v.calendar.google.com/events?key=$API_KEY"
```

### Phase 2: MCP Server Testing
```bash
# Initialize server
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}' | node server.js

# Test authentication status
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_auth_status","arguments":{}},"id":2}' | node server.js

# Test OAuth2 URL generation
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_get_auth_url","arguments":{}},"id":3}' | node server.js
```

### Phase 3: Token Management Testing
```bash
# Test token storage
node -e "
const storage = new TokenStorage('~/.config/gcal-mcp');
await storage.storeTokens('test@example.com', { access_token: 'test123' });
const tokens = await storage.getTokens('test@example.com');
console.log('Token storage:', tokens ? 'SUCCESS' : 'FAILED');
"

# Test token refresh
node -e "
const auth = new AuthenticationManager();
await auth.initialize();
await auth.refreshTokens();
console.log('Token refresh:', 'SUCCESS');
"
```

### Phase 4: Rate Limiting Testing
```bash
# Test rate limit handling
for i in {1..20}; do
  echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"test_rate_limit","arguments":{}},"id":'$i'}' | node server.js &
done
wait
```

## Authentication Tools to Implement

### Tool: `gcal_auth_status`
**Purpose**: Check current authentication status and available scopes

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Output Example**:
```json
{
  "authenticated": true,
  "method": "oauth2",
  "account": "user@example.com",
  "scopes": [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events"
  ],
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

### Tool: `gcal_get_auth_url`
**Purpose**: Generate OAuth2 authorization URL for user consent

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "scopes": {
      "type": "array",
      "items": { "type": "string" },
      "description": "OAuth2 scopes to request"
    },
    "state": {
      "type": "string",
      "description": "State parameter for CSRF protection"
    }
  }
}
```

**Output Example**:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "state": "random_state_string"
}
```

### Tool: `gcal_handle_auth_callback`
**Purpose**: Process OAuth2 callback and store tokens

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "code": {
      "type": "string",
      "description": "Authorization code from callback"
    },
    "state": {
      "type": "string",
      "description": "State parameter for validation"
    }
  },
  "required": ["code"]
}
```

## Error Handling

### Authentication Errors
```typescript
class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Error codes
const AUTH_ERRORS = {
  NO_CREDENTIALS: 'auth/no-credentials',
  INVALID_TOKEN: 'auth/invalid-token',
  EXPIRED_TOKEN: 'auth/expired-token',
  INSUFFICIENT_SCOPE: 'auth/insufficient-scope',
  REFRESH_FAILED: 'auth/refresh-failed',
};
```

### Error Recovery
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (error.code === 401) {
        // Try token refresh
        await authManager.refreshTokens();
      } else if (error.code === 429) {
        // Rate limit - exponential backoff
        await delay(Math.pow(2, i) * 1000);
      } else if (error.code >= 500) {
        // Server error - retry with delay
        await delay(1000);
      } else {
        // Non-retryable error
        throw error;
      }
    }
  }
  
  throw lastError;
}
```

## Environment Variables

### Required Variables
```bash
# OAuth2 credentials can be provided via:
# 1. credentials.json file in ~/.config/mcp-gcal/ (recommended)
# 2. credentials.json file in project root
# 3. Environment variables (below)

# OAuth2 via Environment Variables (optional)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

### Optional Variables
```bash
# Logging
GCAL_LOG_LEVEL=info  # debug, info, warn, error

# Paths (usually auto-configured)
# Token storage: ~/.config/mcp-gcal/token.json
# Credentials: ~/.config/mcp-gcal/credentials.json
```

### Current Implementation Notes
- **Token Path**: Fixed at `~/.config/mcp-gcal/token.json`
- **Credentials Path**: `~/.config/mcp-gcal/credentials.json` or project root `credentials.json`
- **Redirect URI**: Random port between 50000-60000 (`http://localhost:<port>/oauth2callback`)
- **Token Format**: "authorized_user" with refresh_token only
- **Authentication**: Run `npm run auth` before first use

## Security Considerations

### Token Security
1. **Encryption at Rest**: All tokens encrypted using AES-256
2. **File Permissions**: Token files created with 0600 permissions
3. **Memory Protection**: Clear sensitive data from memory after use
4. **No Logging**: Never log tokens or credentials

### OAuth2 Security
1. **PKCE**: Implement Proof Key for Code Exchange
2. **State Parameter**: Validate state to prevent CSRF
3. **Redirect URI**: Strict validation of redirect URIs
4. **Scope Limitation**: Request minimum required scopes

### Service Account Security
1. **Key Rotation**: Support for key rotation
2. **Impersonation Audit**: Log all impersonation attempts
3. **Least Privilege**: Use domain-wide delegation sparingly
4. **Key Protection**: Validate key file permissions

## Success Criteria

### Functional Requirements
- [ ] OAuth2 authentication flow works end-to-end
- [ ] Service account authentication succeeds
- [ ] Token refresh happens automatically
- [ ] Token storage is encrypted and secure
- [ ] Rate limiting prevents API quota exhaustion
- [ ] Error handling covers all failure modes

### Security Requirements
- [ ] No credentials logged or exposed
- [ ] Tokens encrypted at rest
- [ ] CSRF protection implemented
- [ ] File permissions properly set
- [ ] Memory cleared after use

### Performance Requirements
- [ ] Authentication completes in < 2 seconds
- [ ] Token refresh in < 1 second
- [ ] Rate limiter adds < 10ms overhead
- [ ] Logger doesn't block operations

## Deliverables

1. **Core Files**:
   - `src/auth/AuthenticationManager.ts`
   - `src/auth/TokenStorage.ts`
   - `src/auth/OAuth2Handler.ts`
   - `src/auth/ServiceAccountHandler.ts`
   - `src/server.ts`
   - `src/utils/RateLimiter.ts`
   - `src/utils/Logger.ts`

2. **Configuration**:
   - `.env.example` with all variables
   - `config/default.json` with defaults
   - `config/production.json` for production

3. **Tests**:
   - `tests/auth/authentication.test.ts`
   - `tests/auth/token-storage.test.ts`
   - `tests/utils/rate-limiter.test.ts`
   - `tests/fixtures/` with API responses

4. **Documentation**:
   - Authentication setup guide
   - Troubleshooting guide
   - Security best practices

This foundation enables all subsequent calendar functionality while ensuring security, reliability, and performance.