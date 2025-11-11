# Tool Naming Standardization

## Changes Made

| File | Old Name | New Name |
|------|----------|----------|
| create-calendar-acl.ts | gcal-create-calendar-acl | create-calendar-acl |
| delete-calendar-acl.ts | gcal-delete-calendar-acl | delete-calendar-acl |
| find-available-time.ts | gcal-find-available-time | find-available-time |
| freebusy-query.ts | gcal-freebusy-query | freebusy-query |
| list-calendar-acl.ts | gcal-list-calendar-acl | list-calendar-acl |
| quick-add-event.ts | gcal-quick-add-event | quick-add-event |
| update-calendar-acl.ts | gcal-update-calendar-acl | update-calendar-acl |

**Total tools updated:** 7 out of 17 tools

**Tools that were already correct:** 10 tools
- create-calendar
- create-event
- delete-calendar
- delete-event
- get-calendar
- get-event
- list-calendars
- list-events
- update-calendar
- update-event

## Naming Convention

All tool names now follow this pattern:
- **Format:** kebab-case (lowercase with dashes)
- **No prefixes:** No `gcal-`, `calendar-`, or other prefixes
- **Descriptive:** Clear action + object (e.g., `list-events`, `create-calendar`)

## Examples

### Good names (current convention)
- `list-calendars` - Lists all calendars
- `create-event` - Creates a new event
- `quick-add-event` - Quick add using natural language
- `freebusy-query` - Query free/busy information
- `find-available-time` - Find available meeting times
- `create-calendar-acl` - Create access control rule
- `list-calendar-acl` - List access control rules

### Avoid
- `gcal-list-calendars` (no prefix needed)
- `listCalendars` (use kebab-case, not camelCase)
- `list_calendars` (use dashes, not underscores)

## Consistency with mcp-gmail

This matches mcp-gmail's naming pattern:
- `send-email` (not `gmail-send-email`)
- `read-message` (not `gmail-read-message`)
- `search-emails` (not `gmail-search-emails`)

## Complete Tool List (All 17 Tools)

### Calendar Management (5 tools)
1. `list-calendars` - List all calendars
2. `get-calendar` - Get specific calendar details
3. `create-calendar` - Create a new calendar
4. `update-calendar` - Update calendar properties
5. `delete-calendar` - Delete a calendar

### Event Management (5 tools)
6. `list-events` - List events in a calendar
7. `get-event` - Get specific event details
8. `create-event` - Create a new event
9. `update-event` - Update an existing event
10. `delete-event` - Delete an event

### Advanced Features (3 tools)
11. `quick-add-event` - Create event from natural language
12. `freebusy-query` - Check calendar availability
13. `find-available-time` - Find available meeting slots

### Access Control (4 tools)
14. `list-calendar-access` - List who has access to a calendar
15. `grant-calendar-access` - Grant calendar access to someone
16. `update-calendar-access` - Update existing access permissions
17. `revoke-calendar-access` - Revoke calendar access from someone

## ACL → Access Renaming (LLM Clarity Improvement)

To make tools instantly clear to LLMs, renamed ACL (Access Control List) tools:

| Old Name | New Name | Reason |
|----------|----------|--------|
| list-calendar-acl | list-calendar-access | "access" is universally understood |
| create-calendar-acl | grant-calendar-access | "grant" is explicit action verb |
| update-calendar-acl | update-calendar-access | "access" clearer than "acl" |
| delete-calendar-acl | revoke-calendar-access | "revoke" is explicit action verb |

### Why this matters for LLMs

**Before (ACL):**
- "ACL" is technical jargon that could confuse models
- "create" and "delete" are generic CRUD operations
- LLM might not understand: "create-calendar-acl" = "share a calendar with someone"

**After (Access):**
- "access" is plain English, universally understood
- Action verbs (grant/revoke) are more explicit than create/delete
- LLMs can instantly understand: "grant-calendar-access" = "give someone permission to use a calendar"
- "revoke-calendar-access" = "remove someone's access to a calendar"

### Updated Tool Descriptions

All access tools now have LLM-friendly descriptions:

- **list-calendar-access**: "List all people and groups who have access to a calendar, showing their permission levels (owner, writer, reader)"
- **grant-calendar-access**: "Grant calendar access to a person or group by email address, with specified permission level (owner, writer, reader)"
- **update-calendar-access**: "Update an existing person's or group's calendar access level, changing their permissions (owner, writer, reader)"
- **revoke-calendar-access**: "Revoke calendar access from a person or group, completely removing their ability to view or edit the calendar"

## Impact

This change ensures:
- Consistent naming across all 17 tools
- Better alignment with MCP ecosystem conventions (following mcp-gmail's pattern)
- Clearer, more concise tool names
- No confusion between prefixed and non-prefixed tools
- LLM-friendly names that are instantly understandable
- Explicit action verbs (grant/revoke) instead of generic CRUD (create/delete)
