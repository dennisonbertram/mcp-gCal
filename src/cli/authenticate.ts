#!/usr/bin/env node
/**
 * Google Calendar MCP Server - Authentication Setup Script
 *
 * This script performs the OAuth 2.0 authentication flow with Google Calendar API.
 * It will:
 * 1. Open your browser for Google account login
 * 2. Request Calendar permissions
 * 3. Save the authentication token to ~/.config/mcp-gcal/token.json
 *
 * Run this once to authenticate, then the token will be automatically refreshed.
 */

import { createCalendarAuth } from '../auth/index.js';

console.log('\n🔐 Google Calendar MCP Server - Authentication Setup\n');
console.log('This will open your browser to authenticate with Google Calendar API.');
console.log('Please sign in and grant the requested permissions.\n');

async function authenticate() {
  try {
    // Create auth manager
    const authManager = createCalendarAuth();

    console.log('Starting authentication flow...\n');

    // Get authenticated client (this will trigger browser auth if needed)
    const calendar = await authManager.getCalendarClient();

    // Verify authentication by getting calendar list
    console.log('✓ Authentication successful!\n');
    console.log('Testing Calendar API access...\n');

    const calendarList = await calendar.calendarList.list({
      maxResults: 5,
    });

    const calendars = calendarList.data.items || [];

    console.log('✓ Calendar API access verified!');
    console.log(`\n📅 Found ${calendars.length} calendar(s):\n`);

    calendars.forEach((cal) => {
      const primaryIndicator = cal.primary ? ' (Primary)' : '';
      console.log(`   ${cal.summary}${primaryIndicator}`);
      console.log(`      ID: ${cal.id}`);
    });

    console.log('\n✅ Authentication complete!');
    console.log('\nYour token has been saved to ~/.config/mcp-gcal/token.json');
    console.log('You can now start the MCP server with: npm start\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Authentication failed!\n');

    if (error instanceof Error) {
      console.error('Error:', error.message);

      if (error.message.includes('ENOENT') ||
          error.message.includes('credentials') ||
          error.message.includes('clientId') ||
          error.message.includes('clientSecret')) {
        console.error('\n💡 Setup required:');
        console.error('   1. Create a Google Cloud project');
        console.error('   2. Enable the Google Calendar API');
        console.error('   3. Create OAuth 2.0 credentials (Desktop app)');
        console.error('   4. Either:');
        console.error('      - Download credentials.json to project root, OR');
        console.error('      - Download to ~/.config/mcp-gcal/credentials.json, OR');
        console.error('      - Set environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET');
        console.error('\nSee README.md or AUTHENTICATION.md for detailed setup instructions.\n');
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

authenticate();
