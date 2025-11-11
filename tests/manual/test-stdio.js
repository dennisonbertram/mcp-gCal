import { spawn } from 'child_process';
import readline from 'readline';

async function runTests() {
  console.log('===== MCP-gCal stdio Test =====\n');

  // Start server
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: '/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-gCal'
  });

  const rl = readline.createInterface({
    input: server.stdout,
    output: process.stdout,
    terminal: false
  });

  let requestId = 1;
  const responses = new Map();

  // Collect responses
  rl.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      console.log('<<< Response:', JSON.stringify(response, null, 2));
      if (response.id) {
        responses.set(response.id, response);
      }
    } catch (e) {
      console.log('<<< Non-JSON:', line);
    }
  });

  // Helper to send request
  const send = (method, params = {}) => {
    const id = requestId++;
    const req = { jsonrpc: '2.0', id, method, params };
    console.log('\n>>> Request:', JSON.stringify(req, null, 2));
    server.stdin.write(JSON.stringify(req) + '\n');
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (responses.has(id)) {
          clearInterval(check);
          resolve(responses.get(id));
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve(null);
      }, 10000);
    });
  };

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n=== Test 1: Initialize ===');
  const initResult = await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'manual-test', version: '1.0.0' }
  });
  console.log('Init result:', initResult ? 'Success' : 'Timeout');
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n=== Test 2: Initialized ===');
  await send('initialized', {});
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n=== Test 3: List Tools ===');
  const toolsResult = await send('tools/list', {});
  if (toolsResult && toolsResult.result) {
    const tools = toolsResult.result.tools || [];
    console.log(`Found ${tools.length} tools:`);
    tools.forEach(t => console.log(`  - ${t.name}`));
  }
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n=== Test 4: List Calendars ===');
  const calendarsResult = await send('tools/call', {
    name: 'list-calendars',
    arguments: {}
  });
  console.log('Calendars result:', calendarsResult ? 'Received' : 'Timeout');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n=== Test 5: Get Primary Calendar ===');
  const calendarResult = await send('tools/call', {
    name: 'get-calendar',
    arguments: { calendarId: 'primary' }
  });
  console.log('Get calendar result:', calendarResult ? 'Received' : 'Timeout');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n=== Test 6: Invalid Calendar (Error Test) ===');
  const errorResult = await send('tools/call', {
    name: 'get-calendar',
    arguments: { calendarId: 'invalid-id-12345' }
  });
  console.log('Error test result:', errorResult ? 'Received' : 'Timeout');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n=== Test 7: Validation Error (Missing Required Field) ===');
  const validationResult = await send('tools/call', {
    name: 'create-event',
    arguments: { calendarId: 'primary' } // Missing summary, start, end
  });
  console.log('Validation test result:', validationResult ? 'Received' : 'Timeout');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n=== Test 8: Quick Add Event (Natural Language) ===');
  const quickAddResult = await send('tools/call', {
    name: 'quick-add-event',
    arguments: {
      calendarId: 'primary',
      text: 'Team meeting tomorrow at 2pm for 1 hour'
    }
  });
  console.log('Quick add result:', quickAddResult ? 'Received' : 'Timeout');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n=== Test 9: List Events ===');
  const eventsResult = await send('tools/call', {
    name: 'list-events',
    arguments: {
      calendarId: 'primary',
      maxResults: 5
    }
  });
  console.log('List events result:', eventsResult ? 'Received' : 'Timeout');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n=== Test Complete ===');
  server.kill();
  process.exit(0);
}

runTests().catch(console.error);
