#!/usr/bin/env node

/**
 * Entry point for the Google Calendar MCP server
 */

import { AuthManager, AuthConfig } from './auth/AuthManager.js';
import { startServer } from './server.js';
import { createLogger } from './utils/logger.js';
import path from 'path';
import { homedir } from 'os';

const logger = createLogger('main');

/**
 * Get configuration from environment variables
 */
export function getConfig(): AuthConfig {
  const homeDir = homedir();
  
  return {
    method: 'oauth2',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback',
    credentialsDir: process.env.CREDENTIALS_DIR || path.join(homeDir, '.gcal-mcp'),
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  };
}

/**
 * Create and configure the auth manager
 */
export function createAuthManager(config: AuthConfig): AuthManager {
  // Validate required configuration
  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      'Missing required configuration. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
    );
  }
  
  return new AuthManager(config, 'default');
}

/**
 * Main function to start the server
 */
export async function main(): Promise<void> {
  try {
    logger.info('Starting Google Calendar MCP server...');
    
    // Get configuration
    const config = getConfig();
    
    // Create auth manager
    const authManager = createAuthManager(config);
    
    // Start the server
    const server = await startServer(authManager);
    
    logger.info('Google Calendar MCP server is running');
    console.log('Google Calendar MCP server started successfully');
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
    console.error('Failed to start Google Calendar MCP server:');
    console.error(error instanceof Error ? error.message : error);
    
    if (error instanceof Error && error.message.includes('Missing required configuration')) {
      console.error('\nPlease ensure you have set the following environment variables:');
      console.error('  - GOOGLE_CLIENT_ID: Your Google OAuth2 client ID');
      console.error('  - GOOGLE_CLIENT_SECRET: Your Google OAuth2 client secret');
      console.error('\nYou can obtain these from the Google Cloud Console:');
      console.error('  https://console.cloud.google.com/apis/credentials');
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