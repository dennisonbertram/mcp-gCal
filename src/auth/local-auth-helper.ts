// src/auth/local-auth-helper.ts
// Custom OAuth 2.0 authentication helper with better logging and error handling
// Based on @google-cloud/local-auth but with improvements:
// - Prints OAuth URL to console if browser doesn't open
// - Better error messages
// - Port conflict detection
// - Timeout handling

import { OAuth2Client } from 'google-auth-library';
import { createServer, Server } from 'http';
import { URL } from 'url';
import open from 'open';

export interface LocalAuthOptions {
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

/**
 * Perform OAuth 2.0 authentication with enhanced logging and error handling
 */
export async function authenticateWithLogging(
  options: LocalAuthOptions
): Promise<OAuth2Client> {
  const { clientId, clientSecret, scopes } = options;

  // Use a random high port to avoid conflicts
  const port = Math.floor(Math.random() * (60000 - 50000) + 50000);
  const redirectUri = `http://localhost:${port}/oauth2callback`;

  // Create OAuth2 client
  const client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });

  return new Promise((resolve, reject) => {
    let server: Server | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Cleanup function to close server and clear timeout
    function cleanup() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (server) {
        server.close();
        server = null;
      }
    }

    // Create HTTP server to handle OAuth callback
    server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '', `http://localhost:${port}`);

        // Only process requests to the callback path
        if (url.pathname !== '/oauth2callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        // Check for errors in the callback
        if (url.searchParams.has('error')) {
          const error = url.searchParams.get('error');
          const errorDescription = url.searchParams.get('error_description');

          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Authentication Failed</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #dc3545; font-size: 24px; }
                .message { margin-top: 20px; color: #666; }
              </style>
            </head>
            <body>
              <div class="error">✗ Authentication Failed</div>
              <div class="message">${error}: ${errorDescription || 'No description'}</div>
              <div class="message">You can close this window and return to the terminal.</div>
            </body>
            </html>
          `);

          cleanup();
          reject(new Error(`OAuth error: ${error} - ${errorDescription || 'No description'}`));
          return;
        }

        // Check for authorization code
        if (!url.searchParams.has('code')) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Authentication Failed</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #dc3545; font-size: 24px; }
                .message { margin-top: 20px; color: #666; }
              </style>
            </head>
            <body>
              <div class="error">✗ Authentication Failed</div>
              <div class="message">No authorization code provided</div>
              <div class="message">You can close this window and return to the terminal.</div>
            </body>
            </html>
          `);

          cleanup();
          reject(new Error('No authorization code in callback'));
          return;
        }

        const code = url.searchParams.get('code')!;

        // Exchange the authorization code for tokens
        const { tokens } = await client.getToken({
          code,
          redirect_uri: redirectUri,
        });

        client.setCredentials(tokens);

        // Send success response to browser
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Successful</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: #28a745; font-size: 24px; }
              .message { margin-top: 20px; color: #666; }
            </style>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </head>
          <body>
            <div class="success">✓ Authentication Successful!</div>
            <div class="message">You can close this window and return to the terminal.</div>
            <div class="message" style="font-size: 14px; margin-top: 10px;">This window will close automatically in 3 seconds...</div>
          </body>
          </html>
        `);

        cleanup();
        resolve(client);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Error</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #dc3545; font-size: 24px; }
              .message { margin-top: 20px; color: #666; }
            </style>
          </head>
          <body>
            <div class="error">✗ Internal Server Error</div>
            <div class="message">An error occurred during authentication. Please check the terminal for details.</div>
            <div class="message">You can close this window and return to the terminal.</div>
          </body>
          </html>
        `);

        cleanup();
        reject(error);
      }
    });

    // Set a timeout (5 minutes) to prevent hanging forever
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Authentication timed out after 5 minutes. Please try again.'));
    }, 5 * 60 * 1000);

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      cleanup();

      if (error.code === 'EADDRINUSE') {
        reject(new Error(
          `Port ${port} is already in use by another process.\n\n` +
          `To fix this:\n` +
          `  1. Find the process: lsof -i :${port}\n` +
          `  2. Kill the process: kill -9 <PID>\n` +
          `  3. Try authenticating again\n\n` +
          `Or the authentication will automatically retry with a different random port.`
        ));
      } else {
        reject(error);
      }
    });

    // Start listening
    server.listen(port, async () => {
      // Generate the authorization URL
      const authorizeUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes.join(' '),
        redirect_uri: redirectUri,
        prompt: 'consent', // Force consent screen to ensure we get a refresh token
      });

      console.log('\n📋 GOOGLE CALENDAR AUTHENTICATION\n');
      console.log('Opening browser for authentication...\n');
      console.log('If the browser does not open automatically, please visit this URL:\n');
      console.log(authorizeUrl);
      console.log('');

      // Try to open the browser
      try {
        const childProcess = await open(authorizeUrl, { wait: false });
        childProcess.unref();
      } catch (error) {
        // Browser couldn't open - user will see the URL above
        console.log('⚠️  Could not automatically open browser. Please open the URL above manually.\n');
      }
    });
  });
}
