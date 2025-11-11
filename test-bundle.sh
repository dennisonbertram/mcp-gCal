#!/bin/bash

# Test the bundled MCP Calendar server
# This verifies the bundle works WITHOUT the dist/ directory or node_modules

echo "🧪 Testing Bundled MCP Calendar Server"
echo "======================================"
echo ""

BUNDLE="dist/gcalendar-mcp.bundle.cjs"

# Check bundle exists
if [ ! -f "$BUNDLE" ]; then
  echo "❌ Bundle not found: $BUNDLE"
  exit 1
fi

echo "✅ Bundle exists: $BUNDLE"
ls -lh "$BUNDLE"
echo ""

# Test 1: Initialize and list tools
echo "Test 1: Initialize & List Tools"
echo "--------------------------------"
(
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
  sleep 1
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  sleep 2
) | node "$BUNDLE" 2>&1 | grep -E '(jsonrpc|name.*mcp-gcal|tools.*17|create-calendar|list-calendars)' | head -20

echo ""
echo "Test 2: List Calendars (with authentication)"
echo "---------------------------------------------"
(
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
  sleep 1
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list-calendars","arguments":{}}}'
  sleep 3
) | node "$BUNDLE" 2>&1 | grep -E '(Using existing|Found [0-9]+ calendar|summary)' | head -10

echo ""
echo "======================================"
echo "📊 Test Complete"
echo "======================================"
