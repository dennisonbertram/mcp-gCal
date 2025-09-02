#!/usr/bin/env node

/**
 * Test script to verify MCP server functionality
 * This script tests the server via stdio transport using JSON-RPC messages
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test messages
const messages = [
  // Initialize
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  },
  // List tools
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  }
];

async function testServer() {
  console.log('🚀 Starting MCP server test...\n');
  
  // Build the TypeScript code first
  console.log('📦 Building TypeScript code...');
  const buildProcess = spawn('npm', ['run', 'build'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  await new Promise((resolve) => {
    buildProcess.on('close', resolve);
  });
  
  console.log('\n🔌 Starting MCP server...');
  
  // Start the server
  const serverPath = join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    env: {
      ...process.env,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'test-client-id',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret',
      NODE_ENV: 'test'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Handle server output
  let responseBuffer = '';
  
  server.stdout.on('data', (data) => {
    const output = data.toString();
    responseBuffer += output;
    
    // Try to parse JSON-RPC responses
    const lines = responseBuffer.split('\n');
    for (const line of lines) {
      if (line.trim() && line.startsWith('{')) {
        try {
          const response = JSON.parse(line);
          if (response.jsonrpc === '2.0') {
            console.log('\n✅ Received response:');
            console.log(JSON.stringify(response, null, 2));
          }
        } catch (e) {
          // Not JSON, regular output
          if (!line.includes('server started') && !line.includes('ready to accept')) {
            console.log('Server:', line);
          }
        }
      }
    }
  });
  
  server.stderr.on('data', (data) => {
    const error = data.toString();
    if (!error.includes('[32minfo') && !error.includes('Starting')) {
      console.error('❌ Server error:', error);
    }
  });
  
  // Wait a bit for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Send test messages
  for (const message of messages) {
    console.log(`\n📤 Sending ${message.method} request...`);
    server.stdin.write(JSON.stringify(message) + '\n');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Wait a bit more for final responses
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Close the server
  console.log('\n🛑 Closing server...');
  server.kill('SIGTERM');
  
  // Wait for server to close
  await new Promise((resolve) => {
    server.on('close', resolve);
  });
  
  console.log('\n✨ Test complete!');
}

// Run the test
testServer().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});