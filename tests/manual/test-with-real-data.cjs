const { spawn } = require('child_process');
const readline = require('readline');

async function testRealCalendar() {
  console.log('===== MCP-gCal Real Data Test =====\n');

  // Start server
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: '/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-gCal'
  });

  const rl = readline.createInterface({
    input: server.stdout,
    terminal: false
  });

  // Capture stderr for auth messages
  server.stderr.on('data', (data) => {
    const msg = data.toString();
    console.error('SERVER:', msg);

    // If OAuth URL is printed, show it clearly
    if (msg.includes('http')) {
      console.log('\n🔐 AUTHENTICATION REQUIRED:');
      console.log(msg);
      console.log('Please authenticate in your browser\n');
    }
  });

  let requestId = 1;
  const responses = new Map();

  rl.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      if (response.id) {
        responses.set(response.id, response);
      }
    } catch (e) {
      // Not JSON, skip
    }
  });

  const send = (method, params = {}) => {
    const id = requestId++;
    const req = { jsonrpc: '2.0', id, method, params };
    console.log(`\n>>> ${method}`);
    if (Object.keys(params).length > 0) {
      console.log('    Params:', JSON.stringify(params, null, 2));
    }
    server.stdin.write(JSON.stringify(req) + '\n');
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (responses.has(id)) {
          clearInterval(check);
          const response = responses.get(id);
          console.log(`<<< Response (id ${id}):`);
          if (response.result) {
            console.log('    ✅ Success');
          } else if (response.error) {
            console.log('    ❌ Error:', response.error.message);
          }
          resolve(response);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        console.log('    ⏱️  Timeout (no response)');
        resolve(null);
      }, 30000); // 30 second timeout for auth flow
    });
  };

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n=== Test 1: Initialize Server ===');
  await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'real-data-test', version: '1.0.0' }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n=== Test 2: Initialized Notification ===');
  await send('initialized', {});
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n=== Test 3: List Available Tools ===');
  const toolsResp = await send('tools/list', {});
  if (toolsResp?.result?.tools) {
    console.log(`    Found ${toolsResp.result.tools.length} tools:`);
    toolsResp.result.tools.forEach(t => {
      console.log(`      - ${t.name}`);
    });
  }

  console.log('\n=== Test 4: List Calendars (Real API Call) ===');
  console.log('    This will trigger OAuth if not authenticated...');
  const calendarsResp = await send('tools/call', {
    name: 'list-calendars',
    arguments: {}
  });

  if (calendarsResp?.result?.content) {
    console.log('    ✅ Got calendar data!');
    try {
      const content = calendarsResp.result.content[0];
      if (content.type === 'text') {
        const data = JSON.parse(content.text);
        console.log(`    Found ${data.calendars?.length || 0} calendars`);
        if (data.calendars && data.calendars.length > 0) {
          console.log('    Sample calendar:', data.calendars[0].summary);
        }
      }
    } catch (e) {
      console.log('    Response:', calendarsResp.result);
    }
  }

  console.log('\n=== Test 5: List Events from Primary Calendar ===');
  const eventsResp = await send('tools/call', {
    name: 'list-events',
    arguments: {
      calendarId: 'primary',
      maxResults: 5,
      timeMin: new Date().toISOString()
    }
  });

  if (eventsResp?.result?.content) {
    console.log('    ✅ Got event data!');
    try {
      const content = eventsResp.result.content[0];
      if (content.type === 'text') {
        const data = JSON.parse(content.text);
        console.log(`    Found ${data.events?.length || 0} upcoming events`);
        if (data.events && data.events.length > 0) {
          data.events.forEach((event, i) => {
            console.log(`    ${i + 1}. ${event.summary || 'No title'}`);
            console.log(`       ${event.start?.dateTime || event.start?.date || 'No date'}`);
          });
        } else {
          console.log('    No upcoming events');
        }
      }
    } catch (e) {
      console.log('    Response:', eventsResp.result);
    }
  }

  console.log('\n=== Test 6: Get Primary Calendar Details ===');
  const calResp = await send('tools/call', {
    name: 'get-calendar',
    arguments: { calendarId: 'primary' }
  });

  if (calResp?.result?.content) {
    console.log('    ✅ Got calendar details!');
    try {
      const content = calResp.result.content[0];
      if (content.type === 'text') {
        const data = JSON.parse(content.text);
        console.log(`    Calendar: ${data.summary}`);
        console.log(`    Timezone: ${data.timeZone}`);
        console.log(`    Description: ${data.description || 'None'}`);
      }
    } catch (e) {
      console.log('    Response:', calResp.result);
    }
  }

  console.log('\n=== Test 7: List Calendar Access (Sharing) ===');
  const accessResp = await send('tools/call', {
    name: 'list-calendar-access',
    arguments: { calendarId: 'primary' }
  });

  if (accessResp?.result?.content) {
    console.log('    ✅ Got access list!');
    try {
      const content = accessResp.result.content[0];
      if (content.type === 'text') {
        const data = JSON.parse(content.text);
        console.log(`    ${data.rules?.length || 0} access rules`);
        if (data.rules && data.rules.length > 0) {
          data.rules.forEach((rule, i) => {
            console.log(`    ${i + 1}. ${rule.scope?.value || 'Unknown'}: ${rule.role}`);
          });
        }
      }
    } catch (e) {
      console.log('    Response:', accessResp.result);
    }
  }

  console.log('\n=== Test Complete ===');
  console.log('Shutting down server...');
  server.kill();

  // Give time for clean shutdown
  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(0);
}

testRealCalendar().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
