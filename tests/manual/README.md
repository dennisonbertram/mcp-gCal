# Manual Testing Guide for mcp-gCal Refactor

## Overview

This directory contains manual testing procedures to validate the refactor from monolithic architecture to mcp-framework-based architecture.

## Baseline State (Pre-Refactor)

The current mcp-gCal implementation has:
- 962-line monolithic tool file (`src/tools/index.ts`)
- Additional advanced tools in separate file (`src/tools/advancedTools.ts`)
- Manual tool registration
- Inline error handling (repeated across tools)
- No Zod validation
- SDK version: 1.0.0
- googleapis version: 144.0.0

### Tools Available (Pre-Refactor)

**Basic Calendar Tools:**
1. `list-calendars` - List all accessible calendars
2. `get-calendar` - Get details of a specific calendar
3. `create-calendar` - Create a new calendar
4. `update-calendar` - Update an existing calendar
5. `delete-calendar` - Delete a calendar

**Event Management Tools:**
6. `list-events` - List events from a calendar
7. `create-event` - Create a new calendar event
8. `get-event` - Get a specific event
9. `update-event` - Update an existing event
10. `delete-event` - Delete an event

**Advanced Tools:**
11. `gcal-freebusy-query` - Check availability across calendars
12. `gcal-find-available-time` - Smart meeting time finder
13. `gcal-quick-add-event` - Create event using natural language
14. `gcal-list-calendar-acl` - List calendar permissions
15. `gcal-create-calendar-acl` - Share calendar with user/group
16. `gcal-update-calendar-acl` - Modify sharing permissions
17. `gcal-delete-calendar-acl` - Remove sharing access

## Manual Testing Procedure

Since the MCP server requires authentication and runs over stdio, automated testing requires a complex setup. Instead, we'll use manual testing via an MCP client.

### Prerequisites

1. **Authentication Setup:**
   ```bash
   npm run auth
   ```
   Follow the browser flow to authenticate with Google Calendar

2. **Build the Server:**
   ```bash
   npm run build
   ```

3. **Start the Server:**
   ```bash
   npm start
   ```

### Testing Checklist

Use an MCP client (like Claude Desktop, Cline, or a custom client) to test each tool:

#### Basic Calendar Operations
- [ ] list-calendars: Lists all calendars
- [ ] get-calendar: Gets primary calendar details
- [ ] create-calendar: Creates a test calendar
- [ ] update-calendar: Updates the test calendar
- [ ] delete-calendar: Deletes the test calendar

#### Event Operations
- [ ] list-events: Lists events from primary calendar
- [ ] create-event: Creates a test event
- [ ] get-event: Retrieves the test event
- [ ] update-event: Updates the test event
- [ ] delete-event: Deletes the test event

#### Advanced Features
- [ ] gcal-freebusy-query: Checks availability
- [ ] gcal-find-available-time: Suggests meeting times
- [ ] gcal-quick-add-event: Creates event from "Meeting tomorrow at 2pm"
- [ ] gcal-list-calendar-acl: Lists primary calendar permissions
- [ ] gcal-create-calendar-acl: Shares test calendar with a user
- [ ] gcal-update-calendar-acl: Updates sharing permission
- [ ] gcal-delete-calendar-acl: Removes sharing permission

#### Error Handling
- [ ] Invalid calendar ID returns proper error
- [ ] Missing required parameters returns validation error
- [ ] Invalid event ID returns not found error
- [ ] Authentication errors are handled gracefully

### Recording Baseline Results

For each test above, document:
1. Input parameters
2. Success/failure
3. Response format
4. Any errors or warnings
5. Execution time (rough estimate)

## Post-Refactor Testing

After the refactor, repeat all tests above and verify:
1. All tools still work identically
2. Error messages are clearer (due to centralized error handling)
3. Response format is unchanged
4. Natural language date parsing still works
5. No regressions in functionality

## Comparison Criteria

The refactor is successful if:
- ✅ All 17 tools function identically
- ✅ Error messages are same or better
- ✅ No breaking changes to API
- ✅ Code is more maintainable (split into files)
- ✅ Better type safety (Zod schemas)
- ✅ Centralized error handling
- ✅ All existing tests pass
