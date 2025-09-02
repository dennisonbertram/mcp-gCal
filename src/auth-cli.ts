#!/usr/bin/env node

/**
 * Standalone authentication command for Google Calendar MCP Server
 * Following the Gmail-MCP-Server pattern for out-of-band authentication
 */

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

const execAsync = promisify(exec);

// Configuration
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.gcal-mcp');
const OAUTH_KEYS_FILE = 'gcp-oauth.keys.json';
const CREDENTIALS_FILE = 'credentials.json';
const REDIRECT_PORT = 3000;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

// Google Calendar API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.settings.readonly'
];

interface OAuthKeys {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris?: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris?: string[];
  };
}

class AuthenticationCLI {
  private oauth2Client?: OAuth2Client;
  private server?: http.Server;

  async run(): Promise<void> {
    console.log('🔐 Google Calendar MCP - Authentication Setup');
    console.log('============================================\n');

    try {
      // Step 1: Load OAuth keys
      const oauthKeys = await this.loadOAuthKeys();
      
      // Step 2: Initialize OAuth2 client
      this.initializeOAuth2Client(oauthKeys);
      
      // Step 3: Check existing credentials
      const existingCredentials = await this.loadExistingCredentials();
      if (existingCredentials) {
        console.log('✅ Found existing credentials');
        const shouldReauth = await this.promptReauthentication();
        if (!shouldReauth) {
          console.log('Using existing authentication.');
          process.exit(0);
        }
      }
      
      // Step 4: Start OAuth2 flow
      await this.performOAuth2Flow();
      
      console.log('\n✅ Authentication complete!');
      console.log('You can now use the Google Calendar MCP server.');
      process.exit(0);
      
    } catch (error) {
      console.error('\n❌ Authentication failed:', error instanceof Error ? error.message : error);
      console.error('\nPlease check the troubleshooting guide in the README.');
      process.exit(1);
    }
  }

  private async loadOAuthKeys(): Promise<OAuthKeys> {
    // Check global location first
    const globalKeysPath = path.join(GLOBAL_CONFIG_DIR, OAUTH_KEYS_FILE);
    const localKeysPath = path.join(process.cwd(), OAUTH_KEYS_FILE);
    
    let keysPath: string;
    
    // Try global location first
    try {
      await fs.access(globalKeysPath);
      keysPath = globalKeysPath;
      console.log(`📁 Found OAuth keys at: ${globalKeysPath}`);
    } catch {
      // Try local location
      try {
        await fs.access(localKeysPath);
        keysPath = localKeysPath;
        console.log(`📁 Found OAuth keys at: ${localKeysPath}`);
        
        // Copy to global location for future use
        await this.ensureGlobalConfigDir();
        await fs.copyFile(localKeysPath, globalKeysPath);
        console.log(`📋 Copied OAuth keys to global config: ${globalKeysPath}`);
      } catch {
        throw new Error(
          `OAuth keys not found!\n\n` +
          `Please place your Google OAuth2 credentials at one of these locations:\n` +
          `  1. ${globalKeysPath} (recommended)\n` +
          `  2. ${localKeysPath} (current directory)\n\n` +
          `Download OAuth2 credentials from Google Cloud Console:\n` +
          `  https://console.cloud.google.com/apis/credentials`
        );
      }
    }
    
    const keysContent = await fs.readFile(keysPath, 'utf-8');
    return JSON.parse(keysContent);
  }

  private initializeOAuth2Client(keys: OAuthKeys): void {
    let clientId: string;
    let clientSecret: string;
    
    if (keys.installed) {
      clientId = keys.installed.client_id;
      clientSecret = keys.installed.client_secret;
    } else if (keys.web) {
      clientId = keys.web.client_id;
      clientSecret = keys.web.client_secret;
    } else {
      throw new Error('Invalid OAuth keys format. Expected "installed" or "web" application credentials.');
    }
    
    this.oauth2Client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);
    console.log('✅ OAuth2 client initialized');
  }

  private async loadExistingCredentials(): Promise<any> {
    const credentialsPath = path.join(GLOBAL_CONFIG_DIR, CREDENTIALS_FILE);
    
    try {
      const credentialsContent = await fs.readFile(credentialsPath, 'utf-8');
      const credentials = JSON.parse(credentialsContent);
      
      if (this.oauth2Client && credentials) {
        this.oauth2Client.setCredentials(credentials);
        
        // Test if credentials are still valid
        try {
          const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
          await calendar.calendarList.list({ maxResults: 1 });
          return credentials;
        } catch (error) {
          console.log('⚠️  Existing credentials are invalid or expired');
          return null;
        }
      }
      
      return credentials;
    } catch {
      return null;
    }
  }

  private async promptReauthentication(): Promise<boolean> {
    // For simplicity, we'll auto-proceed with existing auth
    // In a production version, you might want to prompt the user
    return false;
  }

  private async performOAuth2Flow(): Promise<void> {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }
    
    // Generate auth URL
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
    
    console.log('\n🌐 Opening browser for authentication...');
    
    // Start callback server
    await this.startCallbackServer();
    
    // Open browser
    await this.openBrowser(authUrl);
    
    // Wait for callback
    const code = await this.waitForCallback();
    
    // Exchange code for tokens
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    
    // Save credentials
    await this.saveCredentials(tokens);
    
    // Verify authentication
    await this.verifyAuthentication();
  }

  private async getAuthorizationCodeFromUser(): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      console.log('After granting access, Google will show you an authorization code.');
      rl.question('Please enter the authorization code: ', (code) => {
        rl.close();
        resolve(code.trim());
      });
    });
  }

  private async startCallbackServer(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer();
      this.server.listen(REDIRECT_PORT, () => {
        console.log(`📡 Callback server listening on port ${REDIRECT_PORT}`);
        resolve();
      });
    });
  }

  private async openBrowser(url: string): Promise<void> {
    const platform = process.platform;
    let command: string;
    
    if (platform === 'darwin') {
      command = `open "${url}"`;
    } else if (platform === 'win32') {
      command = `start "${url}"`;
    } else {
      command = `xdg-open "${url}"`;
    }
    
    try {
      await execAsync(command);
      console.log('✅ Browser opened successfully');
    } catch (error) {
      console.log('⚠️  Could not open browser automatically');
      console.log('\nPlease visit this URL manually:');
      console.log(url);
    }
  }

  private async waitForCallback(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        reject(new Error('Callback server not initialized'));
        return;
      }
      
      this.server.on('request', (req, res) => {
        const url = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`);
        
        if (url.pathname === '/oauth2callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');
          
          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; text-align: center;">
                  <h1 style="color: #dc3545;">❌ Authentication Failed</h1>
                  <p>Error: ${error}</p>
                  <p style="color: #666;">Please close this window and try again.</p>
                </body>
              </html>
            `);
            this.server?.close();
            reject(new Error(`Authentication failed: ${error}`));
          } else if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; text-align: center;">
                  <h1 style="color: #28a745;">✅ Authentication Successful!</h1>
                  <p>You can now close this window and return to the terminal.</p>
                  <p style="color: #666;">The Google Calendar MCP server is ready to use.</p>
                  <script>setTimeout(() => window.close(), 3000);</script>
                </body>
              </html>
            `);
            this.server?.close();
            resolve(code);
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid callback request');
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      });
    });
  }

  private async saveCredentials(tokens: any): Promise<void> {
    await this.ensureGlobalConfigDir();
    const credentialsPath = path.join(GLOBAL_CONFIG_DIR, CREDENTIALS_FILE);
    await fs.writeFile(credentialsPath, JSON.stringify(tokens, null, 2));
    console.log(`\n💾 Credentials saved to: ${credentialsPath}`);
  }

  private async verifyAuthentication(): Promise<void> {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const response = await calendar.calendarList.list({ maxResults: 5 });
    
    const calendars = response.data.items || [];
    console.log(`\n📅 Successfully authenticated! Found ${calendars.length} calendar(s):`);
    
    calendars.forEach((cal, index) => {
      const isPrimary = cal.primary ? ' (Primary)' : '';
      console.log(`   ${index + 1}. ${cal.summary}${isPrimary}`);
    });
  }

  private async ensureGlobalConfigDir(): Promise<void> {
    try {
      await fs.mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new AuthenticationCLI();
  cli.run().catch(console.error);
}

export { AuthenticationCLI };