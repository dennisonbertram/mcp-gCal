#!/usr/bin/env node

/**
 * Entry point for the Google Calendar MCP server
 * Following Gmail-MCP pattern: requires pre-authentication via separate auth command
 */

import { AuthManager, AuthConfig } from './auth/AuthManager.js';
import { startServer } from './server.js';
import { createLogger } from './utils/logger.js';
import path from 'path';
import { homedir } from 'os';
import { promises as fs } from 'fs';

const logger = createLogger('main');

/**
 * Check if user has completed out-of-band authentication
 */
async function checkAuthentication(): Promise<boolean> {
  const credentialsPath = path.join(homedir(), '.gcal-mcp', 'credentials.json');
  try {
    await fs.access(credentialsPath);
    
    // Try to parse and validate the credentials
    const content = await fs.readFile(credentialsPath, 'utf-8');
    const credentials = JSON.parse(content);
    
    // Check if we have the necessary tokens
    if (credentials.access_token || credentials.refresh_token) {
      return true;
    }
  } catch (error) {
    // Credentials don't exist or are invalid
  }
  return false;
}

/**
 * Get configuration for authenticated server
 */
export async function getConfig(): Promise<AuthConfig> {
  const homeDir = homedir();
  const globalConfigDir = path.join(homeDir, '.gcal-mcp');
  
  // Load OAuth keys to get client ID and secret
  const oauthKeysPath = path.join(globalConfigDir, 'gcp-oauth.keys.json');
  
  try {
    const keysContent = await fs.readFile(oauthKeysPath, 'utf-8');
    const keys = JSON.parse(keysContent);
    
    let clientId: string;
    let clientSecret: string;
    
    if (keys.installed) {
      clientId = keys.installed.client_id;
      clientSecret = keys.installed.client_secret;
    } else if (keys.web) {
      clientId = keys.web.client_id;
      clientSecret = keys.web.client_secret;
    } else {
      throw new Error('Invalid OAuth keys format');
    }
    
    return {
      method: 'oauth2',
      clientId: clientId,
      clientSecret: clientSecret,
      redirectUri: 'http://localhost:3001/oauth2callback',
      credentialsDir: globalConfigDir,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
      ]
    };
  } catch (error) {
    // Fall back to environment variables if keys file not found
    return {
      method: 'oauth2',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback',
      credentialsDir: globalConfigDir,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
      ]
    };
  }
}

/**
 * Create and configure the auth manager
 */
export function createAuthManager(config: AuthConfig): AuthManager {
  // No validation needed - authentication should already be done
  return new AuthManager(config, 'default');
}

/**
 * Main function to start the server
 */
export async function main(): Promise<void> {
  try {
    // Check for command line arguments
    const args = process.argv.slice(2);
    
    // Handle auth command (like Gmail-MCP does)
    if (args[0] === 'auth') {
      const { AuthenticationCLI } = await import('./auth-cli.js');
      const cli = new AuthenticationCLI();
      await cli.run();
      return;
    }
    
    logger.info('Starting Google Calendar MCP server...');
    
    // Check if authentication has been completed (out-of-band)
    const isAuthenticated = await checkAuthentication();
    
    if (!isAuthenticated) {
      console.error('❌ Authentication required!');
      console.error('');
      console.error('Please authenticate first by running:');
      console.error('  npm run auth');
      console.error('');
      console.error('Or if using the package directly:');
      console.error('  npx @modelcontextprotocol/gcalendar-mcp auth');
      console.error('');
      console.error('This will open your browser to authenticate with Google Calendar.');
      console.error('After authentication, you can start the MCP server.');
      process.exit(1);
    }
    
    // Get configuration
    const config = await getConfig();
    
    // Create auth manager
    const authManager = createAuthManager(config);
    
    // Start the server
    const server = await startServer(authManager);
    
    logger.info('Google Calendar MCP server is running');
    console.log('✅ Google Calendar MCP server started successfully');
    console.log('The server is now ready to accept connections via stdio');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      server.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      server.close();
      process.exit(0);
    });
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    logger.error('Failed to start server', { error });
    console.error('❌ Failed to start Google Calendar MCP server:');
    console.error(error instanceof Error ? error.message : error);
    
    if (error instanceof Error && error.message.includes('OAuth keys')) {
      console.error('\n📋 Setup Instructions:');
      console.error('1. Create a Google Cloud Project and enable Calendar API');
      console.error('2. Generate OAuth2 credentials (Desktop or Web application)');
      console.error('3. Download the credentials JSON file');
      console.error('4. Save it as: ~/.gcal-mcp/gcp-oauth.keys.json');
      console.error('5. Run: npm run auth');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}