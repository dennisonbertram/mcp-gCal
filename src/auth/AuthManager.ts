import { OAuth2Client, Credentials, JWT } from 'google-auth-library';
import { google } from 'googleapis';
import { TokenStorage } from './TokenStorage.js';
import http from 'http';

export type AuthClient = OAuth2Client | JWT;

export interface AuthConfig {
  method: 'oauth2' | 'service_account' | 'api_key';
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  serviceAccountKey?: string;
  apiKey?: string;
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

export class AuthManager {
  private oauth2Client?: OAuth2Client;
  private serviceAccountClient?: JWT;
  private currentTokens?: Credentials;
  private tokenStorage: TokenStorage;
  private config: AuthConfig;
  private callbackServer?: http.Server;
  
  constructor(config: AuthConfig, tenantId?: string) {
    this.config = config;
    
    // Create tenant-specific token storage with encryption enabled for security
    this.tokenStorage = new TokenStorage(config.credentialsDir, tenantId, true);
    
    this.initialize();
  }
  
  private initialize(): void {
    switch (this.config.method) {
      case 'oauth2':
        if (!this.config.clientId || !this.config.clientSecret) {
          throw new AuthenticationError(
            'OAuth2 requires clientId and clientSecret',
            AuthError.CONFIGURATION_ERROR
          );
        }
        this.oauth2Client = new OAuth2Client(
          this.config.clientId,
          this.config.clientSecret,
          this.config.redirectUri || 'http://localhost:3001/oauth2callback'
        );
        break;
        
      case 'service_account':
        if (!this.config.serviceAccountKey) {
          throw new AuthenticationError(
            'Service account requires serviceAccountKey path',
            AuthError.CONFIGURATION_ERROR
          );
        }
        break;
        
      case 'api_key':
        if (!this.config.apiKey) {
          throw new AuthenticationError(
            'API key method requires apiKey',
            AuthError.CONFIGURATION_ERROR
          );
        }
        break;
        
      default:
        throw new AuthenticationError(
          `Unsupported authentication method: ${this.config.method}`,
          AuthError.CONFIGURATION_ERROR
        );
    }
  }
  
  async authenticate(): Promise<AuthClient> {
    console.log(`Authenticating with method: ${this.config.method}`);
    
    try {
      switch (this.config.method) {
        case 'oauth2':
          return await this.authenticateOAuth2();
        case 'service_account':
          throw new AuthenticationError(
            'Service account authentication not yet implemented',
            AuthError.CONFIGURATION_ERROR
          );
        default:
          throw new AuthenticationError(
            `Authentication method ${this.config.method} not yet implemented`,
            AuthError.CONFIGURATION_ERROR
          );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Authentication failed', { error: message });
      throw error;
    }
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
      this.callbackServer = http.createServer((req, res) => {
        try {
          const url = new URL(req.url!, 'http://localhost:3001');
          
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
            
            this.callbackServer?.close();
            resolve(code);
          } else if (url.searchParams.get('error')) {
            const error = url.searchParams.get('error');
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Authorization Failed</h1><p>Error: ${error}</p>`);
            this.callbackServer?.close();
            reject(new Error(`Authorization failed: ${error}`));
          } else {
            res.writeHead(404);
            res.end('Not found');
          }
        } catch (error) {
          this.callbackServer?.close();
          reject(error);
        }
      });
      
      this.callbackServer.listen(3001, () => {
        console.log('🌐 Callback server listening on http://localhost:3001');
      });
      
      this.callbackServer.on('error', (error) => {
        reject(new Error(`Callback server error: ${error.message}`));
      });
    });
  }
  
  private async verifyAuthentication(client: OAuth2Client): Promise<void> {
    try {
      const calendar = google.calendar({ version: 'v3', auth: client });
      await calendar.calendarList.list({ maxResults: 1 });
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error && 
          (error as any).response?.status === 401) {
        throw new AuthenticationError(
          'Calendar API credentials are invalid or expired',
          AuthError.TOKEN_EXPIRED,
          true
        );
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new AuthenticationError(
        `Calendar API verification failed: ${message}`,
        AuthError.NETWORK_ERROR,
        true
      );
    }
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
    return this.oauth2Client || this.serviceAccountClient || null;
  }
  
  isAuthenticated(): boolean {
    return !!(this.oauth2Client?.credentials?.access_token);
  }
  
  getCurrentTokens(): Credentials | null {
    return this.currentTokens || null;
  }
}