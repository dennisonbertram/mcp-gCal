#!/bin/bash

# Google Calendar API Testing Script
# Requires a valid access token

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if access token is provided
if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: ACCESS_TOKEN environment variable not set${NC}"
    echo "Please visit https://developers.google.com/oauthplayground/"
    echo "1. Select Calendar API v3"
    echo "2. Authorize APIs"  
    echo "3. Exchange authorization code for tokens"
    echo "4. Copy the access_token and run:"
    echo "   export ACCESS_TOKEN='your_token_here'"
    echo "   ./test-calendar-api.sh"
    exit 1
fi

# Base URL for Google Calendar API
BASE_URL="https://www.googleapis.com/calendar/v3"

# Output file for responses
OUTPUT_DIR="api-test-responses"
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}=== Google Calendar API Testing ===${NC}"
echo "Access Token: ${ACCESS_TOKEN:0:20}..."
echo "Output Directory: $OUTPUT_DIR"
echo ""

# Function to make API call and save response
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local description="$3"
    local filename="$4"
    local data="$5"
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Endpoint: $method $endpoint"
    
    local curl_cmd="curl -s"
    
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "PATCH" ]; then
        curl_cmd="$curl_cmd -X $method"
        if [ ! -z "$data" ]; then
            curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
        fi
    elif [ "$method" = "DELETE" ]; then
        curl_cmd="$curl_cmd -X DELETE"
    fi
    
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $ACCESS_TOKEN' '$endpoint'"
    
    # Execute curl and save response
    eval "$curl_cmd" > "$OUTPUT_DIR/$filename.json" 2>&1
    
    # Check if response contains error
    if grep -q '"error"' "$OUTPUT_DIR/$filename.json"; then
        echo -e "${RED}❌ Error in response${NC}"
        cat "$OUTPUT_DIR/$filename.json" | head -5
    else
        echo -e "${GREEN}✅ Success - Response saved to $filename.json${NC}"
        # Show first few lines of successful response
        echo "Preview:"
        cat "$OUTPUT_DIR/$filename.json" | head -3 | sed 's/^/  /'
    fi
    echo ""
}

echo -e "${BLUE}=== CALENDAR MANAGEMENT ENDPOINTS ===${NC}"

# 1. List Calendars
test_endpoint "GET" \
    "$BASE_URL/users/me/calendarList" \
    "List all calendars for authenticated user" \
    "01_list_calendars"

# 2. Get primary calendar
test_endpoint "GET" \
    "$BASE_URL/calendars/primary" \
    "Get primary calendar details" \
    "02_get_primary_calendar"

# 3. Create a test calendar
test_endpoint "POST" \
    "$BASE_URL/calendars" \
    "Create a new calendar" \
    "03_create_calendar" \
    '{"summary": "MCP Test Calendar", "description": "Test calendar created by MCP API testing", "timeZone": "America/New_York"}'

echo -e "${BLUE}=== EVENT OPERATIONS ENDPOINTS ===${NC}"

# 4. List events from primary calendar
test_endpoint "GET" \
    "$BASE_URL/calendars/primary/events?maxResults=10&singleEvents=true&orderBy=startTime&timeMin=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "List upcoming events from primary calendar" \
    "04_list_events_primary"

# 5. Create a test event
tomorrow=$(date -v+1d -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -d "tomorrow" -u +%Y-%m-%dT%H:%M:%SZ)
tomorrow_end=$(date -v+1d -v+1H -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -d "tomorrow +1 hour" -u +%Y-%m-%dT%H:%M:%SZ)

test_endpoint "POST" \
    "$BASE_URL/calendars/primary/events" \
    "Create a test event" \
    "05_create_event" \
    "{\"summary\": \"MCP API Test Event\", \"description\": \"Event created by MCP Calendar API testing\", \"start\": {\"dateTime\": \"$tomorrow\", \"timeZone\": \"America/New_York\"}, \"end\": {\"dateTime\": \"$tomorrow_end\", \"timeZone\": \"America/New_York\"}}"

echo -e "${BLUE}=== ADVANCED FEATURES ENDPOINTS ===${NC}"

# 6. Free/busy query
test_endpoint "POST" \
    "$BASE_URL/freeBusy" \
    "Query free/busy information" \
    "06_freebusy_query" \
    "{\"timeMin\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"timeMax\": \"$(date -v+7d -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -d "+7 days" -u +%Y-%m-%dT%H:%M:%SZ)\", \"items\": [{\"id\": \"primary\"}]}"

# 7. Calendar colors
test_endpoint "GET" \
    "$BASE_URL/colors" \
    "Get available calendar colors" \
    "07_colors"

# 8. Calendar settings
test_endpoint "GET" \
    "$BASE_URL/users/me/settings" \
    "Get user calendar settings" \
    "08_settings"

# 9. ACL (Access Control List) - list permissions for primary calendar
test_endpoint "GET" \
    "$BASE_URL/calendars/primary/acl" \
    "List calendar permissions (ACL)" \
    "09_calendar_acl"

echo -e "${BLUE}=== SUMMARY ===${NC}"
echo "API testing completed!"
echo "Responses saved in: $OUTPUT_DIR/"
echo ""
echo "Files created:"
ls -la "$OUTPUT_DIR/"