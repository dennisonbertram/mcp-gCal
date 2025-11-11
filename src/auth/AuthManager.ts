import { OAuth2Client, Credentials } from 'google-auth-library';
import { google } from 'googleapis';
import { calendar_v3 } from 'googleapis';
import { TokenStorage } from './TokenStorage.js';
import http from 'http';
import { homedir } from 'os';
import { join } from 'path';
import { readFileSync } from 'fs';

export type AuthClient = OAuth2Client;

export interface AuthConfig {
  method: 'oauth2';
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  credentialsDir: string;
  scopes: string[];
}

export enum AuthError {
  INVALID_CREDENTIALS = 'Invalid credentials provided',
  TOKEN_EXPIRED = 'Authentication token has expired',
  REFRESH_FAILED = 'Failed to refresh authentication token',
  NETWORK_ERROR = 'Network error during authentication',
  INVALID_SCOPE = 'Requested scope not authorized',
  RATE_LIMITED = 'Too many authentication attempts',
  UNAUTHENTICATED = 'No valid authentication found',
  CONFIGURATION_ERROR = 'Authentication configuration error',
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: AuthError,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class CalendarAuthManager {
  private oauth2Client?: OAuth2Client;
  private currentTokens?: Credentials | undefined;
  private tokenStorage: TokenStorage;
  private config: AuthConfig;
  private callbackServer?: http.Server;

  constructor(config?: AuthConfig) {
    // Load credentials following mcp-gmail pattern
    // Priority: config > env vars > credentials file
    const creds = config ? {
      clientId: config.clientId,
      clientSecret: config.clientSecret
    } : this.loadCredentialsSync();

    // Default config using standard MCP paths
    const defaultConfig: AuthConfig = {
      method: 'oauth2',
      clientId: creds.clientId || '',
      clientSecret: creds.clientSecret || '',
      redirectUri: `http://localhost:${Math.floor(Math.random() * 10000) + 50000}/oauth2callback`,
      credentialsDir: join(homedir(), '.config', 'mcp-gcal'),
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
      ]
    };

    this.config = config || defaultConfig;

    // Disable encryption for MCP compatibility
    this.tokenStorage = new TokenStorage(this.config.credentialsDir, undefined, false);

    this.initialize();
  }

  private loadCredentialsSync(): { clientId: string; clientSecret: string } {
    // Try environment variables first
    const envClientId = process.env.GOOGLE_CLIENT_ID || process.env.GCAL_CLIENT_ID;
    const envClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GCAL_CLIENT_SECRET;

    if (envClientId && envClientSecret) {
      return { clientId: envClientId, clientSecret: envClientSecret };
    }

    // Try loading from credentials.json file
    // Priority: ~/.config/mcp-gcal/credentials.json > ./credentials.json
    const homeConfigPath = join(homedir(), '.config', 'mcp-gcal', 'credentials.json');
    const localPath = join(process.cwd(), 'credentials.json');

    for (const credPath of [homeConfigPath, localPath]) {
      try {
        const content = readFileSync(credPath, 'utf-8');
        const credentials = JSON.parse(content);
        const creds = credentials.installed || credentials.web;

        if (creds && creds.client_id && creds.client_secret) {
          return {
            clientId: creds.client_id,
            clientSecret: creds.client_secret
          };
        }
      } catch (error) {
        // File doesn't exist or invalid, try next location
        continue;
      }
    }

    // No credentials found, return empty (will trigger error in initialize())
    return { clientId: '', clientSecret: '' };
  }

  private initialize(): void {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new AuthenticationError(
        'OAuth2 requires clientId and clientSecret',
        AuthError.CONFIGURATION_ERROR
      );
    }

    // Use google.auth.OAuth2 pattern from mcp-gmail
    const client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri || `http://localhost:${Math.floor(Math.random() * 10000) + 50000}/oauth2callback`
    );

    this.oauth2Client = client as unknown as OAuth2Client;
  }
  
  async authenticate(): Promise<AuthClient> {
    console.log('Authenticating with OAuth2');

    try {
      return await this.authenticateOAuth2();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Authentication failed', { error: message });
      throw error;
    }
  }

  async getAuthClient(): Promise<OAuth2Client> {
    return await this.authenticate();
  }

  async getCalendarClient(): Promise<calendar_v3.Calendar> {
    const auth = await this.getAuthClient();
    return google.calendar({ version: 'v3', auth: auth as any });
  }

  private async authenticateOAuth2(): Promise<OAuth2Client> {
    if (!this.oauth2Client) {
      throw new AuthenticationError(
        'OAuth2 client not initialized',
        AuthError.CONFIGURATION_ERROR
      );
    }
    
    // Try to load existing tokens
    const tokens = await this.tokenStorage.loadTokens();
    if (tokens) {
      this.oauth2Client.setCredentials(tokens);
      this.currentTokens = tokens;
      
      // Skip verification and trust existing tokens for MCP usage (matching gdrive-mcp)
      console.log('✅ Using existing Calendar API tokens (verification skipped for MCP)');
      return this.oauth2Client;
    }
    
    // Need new authentication
    return await this.startOAuthFlow();
  }
  
  async getAuthUrl(): Promise<string> {
    if (!this.oauth2Client) {
      throw new AuthenticationError(
        'OAuth2 not configured',
        AuthError.CONFIGURATION_ERROR
      );
    }
    
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
      prompt: 'consent', // Force consent to get refresh token
    });
    
    return authUrl;
  }
  
  async handleCallback(code: string): Promise<void> {
    if (!this.oauth2Client) {
      throw new AuthenticationError(
        'OAuth2 not configured',
        AuthError.CONFIGURATION_ERROR
      );
    }
    
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.currentTokens = tokens;
      
      // Save tokens securely
      await this.tokenStorage.saveTokens(tokens);
      
      console.log('✅ Calendar API tokens saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AuthenticationError(
        `Failed to exchange authorization code: ${message}`,
        AuthError.INVALID_CREDENTIALS
      );
    }
  }
  
  async startOAuthFlow(): Promise<OAuth2Client> {
    console.log('🔐 Starting Google Calendar OAuth2 flow...');
    
    const authUrl = await this.getAuthUrl();
    
    console.log('\n📋 GOOGLE CALENDAR AUTHENTICATION');
    console.log('================================');
    console.log('Please visit this URL to authorize Calendar API access:');
    console.log(authUrl);
    console.log('\n⏳ Waiting for authorization callback...\n');
    
    // Start callback server
    const code = await this.waitForCallback();
    await this.handleCallback(code);
    
    return this.oauth2Client!;
  }
  
  private waitForCallback(): Promise<string> {
    return new Promise((resolve, reject) => {
      const port = Math.floor(Math.random() * 10000) + 50000;
      const timeout = setTimeout(() => {
        this.callbackServer?.close();
        reject(new Error('OAuth callback timeout after 5 minutes'));
      }, 5 * 60 * 1000);

      this.callbackServer = http.createServer((req, res) => {
        try {
          const url = new URL(req.url!, `http://localhost:${port}`);

          if (url.pathname === '/oauth2callback' && url.searchParams.get('code')) {
            const code = url.searchParams.get('code')!;

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; text-align: center;">
                  <h1 style="color: #34a853;">✅ Authentication Successful!</h1>
                  <p>Google Calendar API access has been authorized.</p>
                  <p style="color: #666;">You can now close this window and return to the terminal.</p>
                  <script>setTimeout(() => window.close(), 3000);</script>
                </body>
              </html>
            `);

            clearTimeout(timeout);
            this.callbackServer?.close();
            resolve(code);
          } else if (url.searchParams.get('error')) {
            const error = url.searchParams.get('error');
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Authorization Failed</h1><p>Error: ${error}</p>`);
            clearTimeout(timeout);
            this.callbackServer?.close();
            reject(new Error(`Authorization failed: ${error}`));
          } else {
            res.writeHead(404);
            res.end('Not found');
          }
        } catch (error) {
          clearTimeout(timeout);
          this.callbackServer?.close();
          reject(error);
        }
      });

      this.callbackServer.listen(port, () => {
        console.log(`🌐 Callback server listening on http://localhost:${port}`);
      });

      this.callbackServer.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Callback server error: ${error.message}`));
      });
    });
  }

  async refreshTokens(): Promise<void> {
    if (!this.oauth2Client || !this.currentTokens?.refresh_token) {
      throw new AuthenticationError(
        'No refresh token available',
        AuthError.REFRESH_FAILED
      );
    }
    
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      this.currentTokens = credentials;
      
      // Save refreshed tokens
      await this.tokenStorage.saveTokens(credentials);
      
      console.log('🔄 Calendar API tokens refreshed successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AuthenticationError(
        `Token refresh failed: ${message}`,
        AuthError.REFRESH_FAILED
      );
    }
  }
  
  async clearTokens(): Promise<void> {
    await this.tokenStorage.clearTokens();
    this.currentTokens = undefined;
    if (this.oauth2Client) {
      this.oauth2Client.setCredentials({});
    }
    console.log('🗑️ Calendar API tokens cleared');
  }
  
  getClient(): AuthClient | null {
    return this.oauth2Client || null;
  }

  isAuthenticated(): boolean {
    return !!(this.oauth2Client?.credentials?.access_token);
  }

  getCurrentTokens(): Credentials | null {
    return this.currentTokens || null;
  }
}

/**
 * Factory function to create CalendarAuthManager instances
 * Used by tools to create fresh auth instances
 */
export function createCalendarAuth(): CalendarAuthManager {
  return new CalendarAuthManager();
}