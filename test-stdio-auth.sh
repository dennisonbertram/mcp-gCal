#!/bin/bash

# Test script for MCP server stdio interface after authentication

echo "Testing MCP server with stdio and Calendar API calls..."
echo ""

# Send test messages to the server
(
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'
  sleep 0.5
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  sleep 0.5
  echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list-calendars","arguments":{"maxResults":3}}}'
  sleep 3
  echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"list-events","arguments":{"calendarId":"primary","maxResults":3}}}'
  sleep 3
) | node dist/index.js 2>&1 | grep -v "WARN" | grep -E '(jsonrpc|summary|Using existing|Authentication)' | head -40
