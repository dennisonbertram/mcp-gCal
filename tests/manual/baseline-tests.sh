#!/usr/bin/env bash

# Baseline Test Suite for mcp-gCal
# Tests all tools with stdio transport before refactoring
# Usage: ./baseline-tests.sh > baseline-results.json

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test result tracking
RESULTS_FILE="baseline-results.json"
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Build the project first
echo "Building mcp-gCal..." >&2
npm run build >&2

# Start the MCP server
echo "Starting MCP server..." >&2
SERVER_PID=""

# Function to stop server
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    echo "Stopping server..." >&2
    kill $SERVER_PID 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Start server in background
node dist/index.js &
SERVER_PID=$!
sleep 3

# Check if server is running
if ! ps -p $SERVER_PID > /dev/null 2>&1; then
  echo -e "${RED}ERROR: Server failed to start${NC}" >&2
  exit 1
fi

echo "Server started with PID: $SERVER_PID" >&2

# Begin JSON output
echo "{"
echo '  "testSuite": "mcp-gCal Baseline Tests",'
echo '  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",'
echo '  "tests": ['

# Helper function to send JSON-RPC request
send_request() {
  local method="$1"
  local params="$2"
  local test_name="$3"

  TEST_COUNT=$((TEST_COUNT + 1))

  local request='{
    "jsonrpc": "2.0",
    "id": '$TEST_COUNT',
    "method": "'$method'",
    "params": '$params'
  }'

  echo -e "${YELLOW}Test $TEST_COUNT: $test_name${NC}" >&2
  echo "Request: $request" >&2

  local start_time=$(date +%s%N)
  local response=$(echo "$request" | nc -w 5 localhost 3000 2>&1 || echo '{"error": "Connection failed"}')
  local end_time=$(date +%s%N)
  local duration=$(( (end_time - start_time) / 1000000 ))

  echo "Response: $response" >&2

  # Check if response indicates success
  local status="PASS"
  if echo "$response" | grep -q "error"; then
    status="FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo -e "${RED}✗ FAIL${NC}" >&2
  else
    PASS_COUNT=$((PASS_COUNT + 1))
    echo -e "${GREEN}✓ PASS${NC}" >&2
  fi

  # Output test result
  [ $TEST_COUNT -gt 1 ] && echo ","
  cat <<EOF
    {
      "testNumber": $TEST_COUNT,
      "name": "$test_name",
      "method": "$method",
      "params": $params,
      "response": $(echo "$response" | jq -c '.' 2>/dev/null || echo '"'$response'"'),
      "status": "$status",
      "durationMs": $duration
    }
EOF
}

# Test 1: Initialize connection
send_request "initialize" '{
  "protocolVersion": "2024-11-05",
  "capabilities": {},
  "clientInfo": {
    "name": "baseline-test",
    "version": "1.0.0"
  }
}' "Initialize connection"

# Test 2: List tools (discover available tools)
send_request "tools/list" '{}' "List available tools"

# Test 3: List calendars
send_request "tools/call" '{
  "name": "list-calendars",
  "arguments": {
    "showDeleted": false,
    "showHidden": false
  }
}' "List calendars"

# Test 4: Get primary calendar
send_request "tools/call" '{
  "name": "get-calendar",
  "arguments": {
    "calendarId": "primary"
  }
}' "Get primary calendar details"

# Test 5: List events from primary calendar
send_request "tools/call" '{
  "name": "list-events",
  "arguments": {
    "calendarId": "primary",
    "maxResults": 10,
    "singleEvents": true,
    "orderBy": "startTime"
  }
}' "List events from primary calendar"

# Test 6: Create calendar (test calendar for testing)
send_request "tools/call" '{
  "name": "create-calendar",
  "arguments": {
    "summary": "MCP Test Calendar - Baseline",
    "description": "Test calendar created during baseline testing",
    "timeZone": "America/New_York"
  }
}' "Create test calendar"

# Note: We'd need to extract the calendar ID from the response to continue
# For now, we'll test with primary calendar

# Test 7: Create event
send_request "tools/call" '{
  "name": "create-event",
  "arguments": {
    "calendarId": "primary",
    "summary": "Baseline Test Event",
    "description": "Created during baseline testing",
    "start": {
      "dateTime": "'$(date -u -v+1d +"%Y-%m-%dT10:00:00Z")'",
      "timeZone": "America/New_York"
    },
    "end": {
      "dateTime": "'$(date -u -v+1d +"%Y-%m-%dT11:00:00Z")'",
      "timeZone": "America/New_York"
    }
  }
}' "Create event in primary calendar"

# Test 8: Query free/busy
send_request "tools/call" '{
  "name": "gcal-freebusy-query",
  "arguments": {
    "calendarIds": "primary",
    "timeMin": "'$(date -u +"%Y-%m-%dT00:00:00Z")'",
    "timeMax": "'$(date -u -v+7d +"%Y-%m-%dT23:59:59Z")'"
  }
}' "Query free/busy information"

# Test 9: Find available time
send_request "tools/call" '{
  "name": "gcal-find-available-time",
  "arguments": {
    "calendarIds": "primary",
    "duration": 60,
    "searchRange": "next week",
    "maxSuggestions": 3
  }
}' "Find available time slots"

# Test 10: Quick add event (natural language)
send_request "tools/call" '{
  "name": "gcal-quick-add-event",
  "arguments": {
    "calendarId": "primary",
    "text": "Team meeting tomorrow at 3pm for 1 hour"
  }
}' "Quick add event with natural language"

# Test 11: List calendar ACL
send_request "tools/call" '{
  "name": "gcal-list-calendar-acl",
  "arguments": {
    "calendarId": "primary"
  }
}' "List calendar ACL permissions"

# Test 12: Error handling - Invalid calendar ID
send_request "tools/call" '{
  "name": "get-calendar",
  "arguments": {
    "calendarId": "invalid-calendar-id-12345"
  }
}' "Error handling: Invalid calendar ID"

# Test 13: Error handling - Missing required parameter
send_request "tools/call" '{
  "name": "create-event",
  "arguments": {
    "calendarId": "primary"
  }
}' "Error handling: Missing required parameters"

# Test 14: Error handling - Invalid event ID
send_request "tools/call" '{
  "name": "get-event",
  "arguments": {
    "calendarId": "primary",
    "eventId": "invalid-event-id-99999"
  }
}' "Error handling: Invalid event ID"

# Close JSON output
echo ""
echo "  ],"
echo '  "summary": {'
echo '    "total": '$TEST_COUNT','
echo '    "passed": '$PASS_COUNT','
echo '    "failed": '$FAIL_COUNT
echo "  }"
echo "}"

# Print summary to stderr
echo -e "\n${YELLOW}=== Test Summary ===${NC}" >&2
echo -e "Total tests: $TEST_COUNT" >&2
echo -e "${GREEN}Passed: $PASS_COUNT${NC}" >&2
echo -e "${RED}Failed: $FAIL_COUNT${NC}" >&2

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}" >&2
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}" >&2
  exit 1
fi
