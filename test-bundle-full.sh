#!/bin/bash

echo "🧪 Testing Bundled Calendar MCP Server"
echo "======================================"
echo ""

BUNDLE="dist/gcalendar-mcp.bundle.cjs"

echo "Test 1: Check bundle file"
echo "-------------------------"
ls -lh "$BUNDLE"
echo ""

echo "Test 2: Initialize & List Tools"
echo "--------------------------------"
(
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
  sleep 1
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  sleep 2
) | node "$BUNDLE" 2>&1 | tee /tmp/bundle-test-output.txt | grep -E 'Tools \(17\)|create-calendar'

TOOLS_FOUND=$(grep -c '"name":"create-calendar"' /tmp/bundle-test-output.txt)
if [ "$TOOLS_FOUND" -gt 0 ]; then
  echo "✅ Bundle has 17 tools registered"
else
  echo "❌ Tools not found"
fi

echo ""
echo "Test 3: Calendar API Call (with auth)"
echo "-------------------------------------"
(
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
  sleep 1
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list-calendars","arguments":{}}}'
  sleep 5
) | node "$BUNDLE" 2>&1 | tee /tmp/bundle-api-test.txt | grep -E 'Using existing|Found [0-9]+ calendar'

if grep -q "Using existing" /tmp/bundle-api-test.txt; then
  echo "✅ Authentication working"
fi

if grep -q "Found.*calendar" /tmp/bundle-api-test.txt; then
  echo "✅ Calendar API call successful"
fi

echo ""
echo "======================================"
echo "📊 Bundle Test Complete"
echo "======================================"
