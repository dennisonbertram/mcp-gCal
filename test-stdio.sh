#!/bin/bash

# Manual stdio test script
cd /Users/dennisonbertram/Develop/ModelContextProtocol/mcp-gCal

echo "===== Starting MCP-gCal Server ====="
echo ""

# Start server in background, capture PID
node dist/index.js &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"
echo "Waiting for server to start..."
sleep 3

# Function to send JSON-RPC request
send_request() {
  local id=$1
  local method=$2
  local params=$3

  echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"method\":\"$method\",\"params\":$params}"
}

echo ""
echo "=== Test 1: Initialize ==="
send_request 1 "initialize" '{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"bash-test","version":"1.0.0"}}'

sleep 2

echo ""
echo "=== Test 2: Initialized ==="
send_request 2 "initialized" '{}'

sleep 2

echo ""
echo "=== Test 3: List Tools ==="
send_request 3 "tools/list" '{}'

sleep 2

echo ""
echo "=== Test 4: List Calendars (Real API Call) ==="
send_request 4 "tools/call" '{"name":"list-calendars","arguments":{}}'

sleep 3

echo ""
echo "=== Test 5: List Events ==="
send_request 5 "tools/call" "{\"name\":\"list-events\",\"arguments\":{\"calendarId\":\"primary\",\"maxResults\":5}}"

sleep 3

echo ""
echo "=== Cleaning up ==="
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "Test complete!"
