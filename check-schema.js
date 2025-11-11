#!/usr/bin/env node
// Quick script to check the schema output format

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const server = spawn('node', ['dist/gcalendar-mcp.bundle.cjs'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send initialize
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0' }
  }
}) + '\n');

await setTimeout(1000);

// Send tools/list
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list'
}) + '\n');

let output = '';
server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  // Ignore stderr
});

await setTimeout(2000);

// Parse and extract schema
try {
  const lines = output.split('\n');
  const toolsLine = lines.find(l => l.includes('"id":2'));
  if (toolsLine) {
    const response = JSON.parse(toolsLine);
    const findTool = response.result.tools.find(t => t.name === 'find-available-time');
    if (findTool) {
      console.log('\n=== find-available-time schema ===\n');
      console.log(JSON.stringify(findTool.inputSchema, null, 2));

      // Check for old-style exclusiveMinimum
      const schemaStr = JSON.stringify(findTool.inputSchema);
      if (schemaStr.includes('"exclusiveMinimum":true')) {
        console.log('\n⚠️  FOUND OLD-STYLE JSON Schema: "exclusiveMinimum": true');
        console.log('This is NOT compatible with JSON Schema draft 2020-12');
      }
    }
  }
} catch (err) {
  console.error('Error:', err.message);
}

server.kill();
process.exit(0);
