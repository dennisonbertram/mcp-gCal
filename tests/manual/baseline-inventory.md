# Baseline Tool Inventory - Main Branch

**Date**: 2025-11-10
**Branch**: main
**Build Status**: Success
**Total Tools**: 17

## Basic Calendar Tools (10)

### 1. list-calendars
**Description**: List all calendars accessible to the user
**Optional Parameters**:
- `showDeleted` (boolean): Whether to include deleted calendar list entries
- `showHidden` (boolean): Whether to show hidden entries

### 2. get-calendar
**Description**: Get details of a specific calendar
**Required Parameters**:
- `calendarId` (string): The calendar identifier

### 3. create-calendar
**Description**: Create a new calendar
**Required Parameters**:
- `summary` (string): Title of the calendar
**Optional Parameters**:
- `description` (string): Description of the calendar
- `timeZone` (string): The time zone of the calendar (IANA format)
- `location` (string): Geographic location of the calendar

### 4. update-calendar
**Description**: Update an existing calendar's metadata
**Required Parameters**:
- `calendarId` (string): The calendar identifier
**Optional Parameters**:
- `summary` (string): New title
- `description` (string): New description
- `timeZone` (string): New time zone
- `location` (string): New location

### 5. delete-calendar
**Description**: Delete a calendar
**Required Parameters**:
- `calendarId` (string): The calendar identifier to delete

### 6. list-events
**Description**: List events from a calendar with flexible filters
**Required Parameters**:
- `calendarId` (string): The calendar identifier
**Optional Parameters**:
- `timeMin` (string): Start of time range (RFC3339 or natural language)
- `timeMax` (string): End of time range (RFC3339 or natural language)
- `maxResults` (number): Maximum number of events (default: 250)
- `orderBy` (string): Sort order - 'startTime' or 'updated'
- `showDeleted` (boolean): Include cancelled events
- `singleEvents` (boolean): Expand recurring events
- `q` (string): Free text search query
- `timeZone` (string): Time zone for the response

### 7. create-event
**Description**: Create a new calendar event with smart date parsing
**Required Parameters**:
- `calendarId` (string): The calendar identifier
- `summary` (string): Event title
- `start` (string): Start date/time (RFC3339 or natural language)
- `end` (string): End date/time (RFC3339 or natural language)
**Optional Parameters**:
- `description` (string): Event description
- `location` (string): Event location
- `attendees` (string): Comma-separated email addresses
- `timeZone` (string): Time zone for the event
- `reminders` (string): Comma-separated reminder minutes
- `recurrence` (string): RRULE string for recurring events
- `colorId` (string): Event color (1-11)
- `guestsCanModify` (boolean): Allow attendees to modify
- `guestsCanInviteOthers` (boolean): Allow attendees to invite others
- `guestsCanSeeOtherGuests` (boolean): Show other attendees

### 8. get-event
**Description**: Get details of a specific event
**Required Parameters**:
- `calendarId` (string): The calendar identifier
- `eventId` (string): The event identifier
**Optional Parameters**:
- `timeZone` (string): Time zone for the response

### 9. update-event
**Description**: Update an existing calendar event
**Required Parameters**:
- `calendarId` (string): The calendar identifier
- `eventId` (string): The event identifier
**Optional Parameters**: (all optional)
- `summary` (string): New event title
- `description` (string): New description
- `location` (string): New location
- `start` (string): New start time
- `end` (string): New end time
- `attendees` (string): New attendees list
- `timeZone` (string): New time zone
- `reminders` (string): New reminders
- `recurrence` (string): New recurrence rule
- `colorId` (string): New color
- `guestsCanModify` (boolean)
- `guestsCanInviteOthers` (boolean)
- `guestsCanSeeOtherGuests` (boolean)

### 10. delete-event
**Description**: Delete an event from a calendar
**Required Parameters**:
- `calendarId` (string): The calendar identifier
- `eventId` (string): The event identifier to delete
**Optional Parameters**:
- `sendUpdates` (string): Whether to send cancellations ('all', 'externalOnly', 'none')

## Advanced Calendar Tools (7)

### 11. gcal-freebusy-query
**Description**: Check availability across multiple calendars using free/busy information
**Required Parameters**:
- `calendarIds` (string): Comma-separated list of calendar IDs or emails
- `timeMin` (string): Start of time range (RFC3339 or natural language)
- `timeMax` (string): End of time range (RFC3339 or natural language)
**Optional Parameters**:
- `timeZone` (string): IANA timezone
- `groupExpansionMax` (number): Maximum number of calendar IDs in group expansion

### 12. gcal-find-available-time
**Description**: Find available time slots across calendars with smart scheduling
**Required Parameters**:
- `calendarIds` (string): Comma-separated calendar IDs
- `duration` (number): Meeting duration in minutes
- `start` (string): Search start time (RFC3339 or natural language)
- `end` (string): Search end time (RFC3339 or natural language)
**Optional Parameters**:
- `workingHours` (string): Working hours range (e.g., "9:00-17:00")
- `timeZone` (string): IANA timezone
- `maxResults` (number): Maximum number of slots to return
- `bufferMinutes` (number): Buffer time between meetings

### 13. gcal-quick-add-event
**Description**: Create event using Google's Quick Add natural language parser
**Required Parameters**:
- `calendarId` (string): The calendar identifier
- `text` (string): Natural language event description
**Optional Parameters**:
- `timeZone` (string): IANA timezone

### 14. gcal-list-calendar-acl
**Description**: List access control rules for a calendar
**Required Parameters**:
- `calendarId` (string): The calendar identifier
**Optional Parameters**:
- `maxResults` (number): Maximum number of rules to return
- `showDeleted` (boolean): Include deleted ACL rules

### 15. gcal-create-calendar-acl
**Description**: Create a new access control rule for a calendar
**Required Parameters**:
- `calendarId` (string): The calendar identifier
- `role` (string): Access role ('owner', 'writer', 'reader', 'freeBusyReader')
- `scopeType` (string): Scope type ('user', 'group', 'domain', 'default')
**Optional Parameters**:
- `scopeValue` (string): Email or domain (required for user/group/domain)
- `sendNotifications` (boolean): Send notification to grantee

### 16. gcal-update-calendar-acl
**Description**: Update an existing access control rule
**Required Parameters**:
- `calendarId` (string): The calendar identifier
- `ruleId` (string): The ACL rule identifier
- `role` (string): New access role
**Optional Parameters**:
- `sendNotifications` (boolean): Send notification

### 17. gcal-delete-calendar-acl
**Description**: Delete an access control rule
**Required Parameters**:
- `calendarId` (string): The calendar identifier
- `ruleId` (string): The ACL rule identifier to delete

## Build Configuration

**TypeScript Version**: Checked via package.json
**Compiler Options**: Standard (no strict mode)
**Dependencies**:
- @modelcontextprotocol/sdk: (version in package.json)
- googleapis: (version in package.json)
- zod: (version in package.json)

## Error Handling Pattern

All tools use inline error handling with these patterns:
- 401 errors: "Authentication failed - please re-authenticate"
- 403 errors: "Insufficient permissions..."
- 404 errors: "Calendar/Event not found..."
- 500+ errors: "Google Calendar service temporarily unavailable"
- Generic: "Failed to [operation]: {error.message}"

## File Structure

- Single file: `src/tools/index.ts` (962 lines)
- Advanced tools: `src/tools/advancedTools.ts`
- Tool registration: Manual via `registerTools()` function
- All tools in one ToolRegistry Map

## Notes

- All 17 tools successfully registered
- Build completes without errors
- Advanced tools are merged into main tools map
- Each tool has inline error handling
- Natural language date parsing supported via dateParser.ts
- Smart scheduling features in find-available-time tool
