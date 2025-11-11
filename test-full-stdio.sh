#!/bin/bash

# Comprehensive test of MCP server stdio interface with real Calendar API calls

echo "🧪 Testing MCP Calendar Server via STDIO"
echo "========================================="
echo ""

# Create a temporary output file
OUTPUT=$(mktemp)

# Run the server with test commands, timeout after 15 seconds
(
  # 1. Initialize
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'
  sleep 1

  # 2. List tools
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  sleep 1

  # 3. List calendars
  echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list-calendars","arguments":{}}}'
  sleep 3

  # 4. List events from primary calendar
  echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"list-events","arguments":{"calendarId":"primary","maxResults":5}}}'
  sleep 3

) | node dist/index.js 2>&1 | tee "$OUTPUT"

echo ""
echo "========================================="
echo "📊 Test Results Summary:"
echo "========================================="

# Check for successful responses
if grep -q '"id":1.*"result"' "$OUTPUT"; then
  echo "✅ Initialize: SUCCESS"
else
  echo "❌ Initialize: FAILED"
fi

if grep -q '"id":2.*"tools"' "$OUTPUT"; then
  echo "✅ Tools List: SUCCESS ($(grep -o '"name":"[^"]*"' "$OUTPUT" | wc -l | tr -d ' ') tools found)"
else
  echo "❌ Tools List: FAILED"
fi

if grep -q '"id":3.*"result"' "$OUTPUT" && ! grep -q '"id":3.*"error"' "$OUTPUT"; then
  echo "✅ List Calendars: SUCCESS"
  echo "   Calendars found:"
  grep -o '"summary":"[^"]*"' "$OUTPUT" | head -5 | sed 's/"summary":"\([^"]*\)"/   - \1/'
else
  echo "❌ List Calendars: FAILED"
  grep '"id":3' "$OUTPUT" | grep -o '"message":"[^"]*"' | sed 's/"message":"/   Error: /'
fi

if grep -q '"id":4.*"result"' "$OUTPUT" && ! grep -q '"id":4.*"error"' "$OUTPUT"; then
  echo "✅ List Events: SUCCESS"
else
  echo "❌ List Events: FAILED"
  grep '"id":4' "$OUTPUT" | grep -o '"message":"[^"]*"' | sed 's/"message":"/   Error: /'
fi

# Cleanup
rm "$OUTPUT"

echo ""
echo "========================================="
