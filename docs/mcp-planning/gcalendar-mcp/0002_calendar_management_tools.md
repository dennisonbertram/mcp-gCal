# Calendar Management Tools Implementation

## Overview
This task implements comprehensive calendar management operations including listing, creating, updating, deleting calendars, managing calendar lists, settings, and colors. It provides the foundational calendar-level operations before dealing with events.

## Dependencies
- Requires completion of Task 0001 (Authentication & Server Setup)
- Must have authenticated Google Calendar API client available

## API Endpoints Covered

### CalendarList Resource
#### calendarList.list
- **Method**: GET
- **URL**: `/calendar/v3/users/me/calendarList`
- **Purpose**: List all calendars in user's calendar list
- **Parameters**:
  - maxResults: Maximum number of entries (1-250)
  - minAccessRole: Filter by minimum access role
  - pageToken: Token for next page
  - showDeleted: Include deleted calendar list entries
  - showHidden: Include hidden calendars
  - syncToken: Token for incremental sync
- **Response**: Calendar list with metadata

#### calendarList.get
- **Method**: GET
- **URL**: `/calendar/v3/users/me/calendarList/{calendarId}`
- **Purpose**: Get specific calendar from list
- **Parameters**:
  - calendarId: Calendar identifier
- **Response**: Calendar list entry

#### calendarList.insert
- **Method**: POST
- **URL**: `/calendar/v3/users/me/calendarList`
- **Purpose**: Add calendar to user's list
- **Request Body**: Calendar list entry
- **Response**: Created calendar list entry

#### calendarList.update
- **Method**: PUT
- **URL**: `/calendar/v3/users/me/calendarList/{calendarId}`
- **Purpose**: Update calendar list entry
- **Parameters**:
  - calendarId: Calendar identifier
  - colorRgbFormat: Use hex color format
- **Request Body**: Updated calendar list entry

#### calendarList.patch
- **Method**: PATCH
- **URL**: `/calendar/v3/users/me/calendarList/{calendarId}`
- **Purpose**: Partial update of calendar list entry
- **Parameters**: Same as update
- **Request Body**: Partial calendar list entry

#### calendarList.delete
- **Method**: DELETE
- **URL**: `/calendar/v3/users/me/calendarList/{calendarId}`
- **Purpose**: Remove calendar from user's list
- **Parameters**:
  - calendarId: Calendar identifier

### Calendars Resource
#### calendars.get
- **Method**: GET
- **URL**: `/calendar/v3/calendars/{calendarId}`
- **Purpose**: Get calendar metadata
- **Parameters**:
  - calendarId: Calendar identifier
- **Response**: Calendar resource

#### calendars.insert
- **Method**: POST
- **URL**: `/calendar/v3/calendars`
- **Purpose**: Create a new secondary calendar
- **Request Body**: Calendar resource
- **Response**: Created calendar

#### calendars.update
- **Method**: PUT
- **URL**: `/calendar/v3/calendars/{calendarId}`
- **Purpose**: Update calendar metadata
- **Parameters**:
  - calendarId: Calendar identifier
- **Request Body**: Updated calendar resource

#### calendars.delete
- **Method**: DELETE
- **URL**: `/calendar/v3/calendars/{calendarId}`
- **Purpose**: Delete a secondary calendar
- **Parameters**:
  - calendarId: Calendar identifier

#### calendars.clear
- **Method**: POST
- **URL**: `/calendar/v3/calendars/{calendarId}/clear`
- **Purpose**: Clear all events from primary calendar
- **Parameters**:
  - calendarId: Calendar identifier (must be primary)

### Colors Resource
#### colors.get
- **Method**: GET
- **URL**: `/calendar/v3/colors`
- **Purpose**: Get available calendar and event colors
- **Response**: Color definitions for calendars and events

### Settings Resource
#### settings.list
- **Method**: GET
- **URL**: `/calendar/v3/users/me/settings`
- **Purpose**: List all user settings
- **Parameters**:
  - maxResults: Maximum number of entries
  - pageToken: Token for next page
  - syncToken: Token for incremental sync

#### settings.get
- **Method**: GET
- **URL**: `/calendar/v3/users/me/settings/{setting}`
- **Purpose**: Get specific setting value
- **Parameters**:
  - setting: Setting identifier

## Tools to Implement

### Tool 1: `gcal_list_calendars`
**Purpose**: List all calendars in user's calendar list with filtering options

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "maxResults": {
      "type": "number",
      "description": "Maximum number of calendars to return (1-250)",
      "default": 50
    },
    "minAccessRole": {
      "type": "string",
      "enum": ["freeBusyReader", "reader", "writer", "owner"],
      "description": "Minimum access role filter"
    },
    "showHidden": {
      "type": "boolean",
      "description": "Include hidden calendars",
      "default": false
    },
    "showDeleted": {
      "type": "boolean",
      "description": "Include deleted calendars",
      "default": false
    }
  }
}
```

**Implementation**:
```typescript
async function handleListCalendars(args: ListCalendarsArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const response = await calendar.calendarList.list({
      maxResults: args.maxResults || 50,
      minAccessRole: args.minAccessRole,
      showHidden: args.showHidden,
      showDeleted: args.showDeleted,
    });
    
    const calendars = response.data.items || [];
    
    return {
      calendars: calendars.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        accessRole: cal.accessRole,
        primary: cal.primary,
        selected: cal.selected,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        hidden: cal.hidden,
        deleted: cal.deleted,
        timeZone: cal.timeZone,
      })),
      nextPageToken: response.data.nextPageToken,
    };
  } catch (error) {
    throw new CalendarError('Failed to list calendars', error);
  }
}
```

**Testing**:
```bash
# Phase 1: Direct API test
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=10"

# Phase 2: MCP test
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_list_calendars","arguments":{"maxResults":10}},"id":1}' | node server.js
```

### Tool 2: `gcal_get_calendar`
**Purpose**: Get detailed information about a specific calendar

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "description": "Calendar identifier (use 'primary' for main calendar)"
    }
  },
  "required": ["calendarId"]
}
```

**Implementation**:
```typescript
async function handleGetCalendar(args: GetCalendarArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Try calendarList first for more details
    const listResponse = await calendar.calendarList.get({
      calendarId: args.calendarId,
    });
    
    // Also get calendar metadata
    const calResponse = await calendar.calendars.get({
      calendarId: args.calendarId,
    });
    
    return {
      ...listResponse.data,
      etag: calResponse.data.etag,
      kind: calResponse.data.kind,
      conferenceProperties: calResponse.data.conferenceProperties,
    };
  } catch (error) {
    throw new CalendarError('Failed to get calendar', error);
  }
}
```

### Tool 3: `gcal_create_calendar`
**Purpose**: Create a new secondary calendar

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "summary": {
      "type": "string",
      "description": "Calendar title"
    },
    "description": {
      "type": "string",
      "description": "Calendar description"
    },
    "timeZone": {
      "type": "string",
      "description": "Time zone (e.g., 'America/New_York')"
    },
    "location": {
      "type": "string",
      "description": "Geographic location"
    },
    "colorId": {
      "type": "string",
      "description": "Color ID from colors.get"
    }
  },
  "required": ["summary"]
}
```

**Implementation**:
```typescript
async function handleCreateCalendar(args: CreateCalendarArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Create the calendar
    const calResponse = await calendar.calendars.insert({
      requestBody: {
        summary: args.summary,
        description: args.description,
        timeZone: args.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: args.location,
      },
    });
    
    // Add to calendar list with color if specified
    if (args.colorId) {
      await calendar.calendarList.insert({
        requestBody: {
          id: calResponse.data.id,
          colorId: args.colorId,
        },
      });
    }
    
    return {
      id: calResponse.data.id,
      summary: calResponse.data.summary,
      description: calResponse.data.description,
      timeZone: calResponse.data.timeZone,
      etag: calResponse.data.etag,
      created: true,
    };
  } catch (error) {
    throw new CalendarError('Failed to create calendar', error);
  }
}
```

### Tool 4: `gcal_update_calendar`
**Purpose**: Update calendar properties and settings

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "description": "Calendar identifier"
    },
    "summary": {
      "type": "string",
      "description": "New calendar title"
    },
    "description": {
      "type": "string",
      "description": "New calendar description"
    },
    "timeZone": {
      "type": "string",
      "description": "New time zone"
    },
    "location": {
      "type": "string",
      "description": "New location"
    },
    "colorId": {
      "type": "string",
      "description": "New color ID"
    },
    "backgroundColor": {
      "type": "string",
      "description": "Background color (hex format)"
    },
    "foregroundColor": {
      "type": "string",
      "description": "Foreground color (hex format)"
    },
    "hidden": {
      "type": "boolean",
      "description": "Hide calendar from list"
    },
    "selected": {
      "type": "boolean",
      "description": "Select calendar in UI"
    },
    "defaultReminders": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "method": {
            "type": "string",
            "enum": ["email", "popup", "sms"]
          },
          "minutes": {
            "type": "number"
          }
        }
      },
      "description": "Default reminders for events"
    },
    "notificationSettings": {
      "type": "object",
      "properties": {
        "notifications": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "enum": ["eventCreation", "eventChange", "eventCancellation", "eventResponse", "agenda"]
              },
              "method": {
                "type": "string",
                "enum": ["email", "sms"]
              }
            }
          }
        }
      }
    }
  },
  "required": ["calendarId"]
}
```

**Implementation**:
```typescript
async function handleUpdateCalendar(args: UpdateCalendarArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const updates: any = {};
    
    // Update calendar metadata if changing core properties
    if (args.summary || args.description || args.timeZone || args.location) {
      const calendarUpdate: any = {};
      if (args.summary) calendarUpdate.summary = args.summary;
      if (args.description) calendarUpdate.description = args.description;
      if (args.timeZone) calendarUpdate.timeZone = args.timeZone;
      if (args.location) calendarUpdate.location = args.location;
      
      const calResponse = await calendar.calendars.update({
        calendarId: args.calendarId,
        requestBody: calendarUpdate,
      });
      
      updates.calendar = calResponse.data;
    }
    
    // Update calendar list entry for display properties
    const listUpdate: any = {};
    if (args.colorId) listUpdate.colorId = args.colorId;
    if (args.backgroundColor) listUpdate.backgroundColor = args.backgroundColor;
    if (args.foregroundColor) listUpdate.foregroundColor = args.foregroundColor;
    if (args.hidden !== undefined) listUpdate.hidden = args.hidden;
    if (args.selected !== undefined) listUpdate.selected = args.selected;
    if (args.defaultReminders) listUpdate.defaultReminders = args.defaultReminders;
    if (args.notificationSettings) listUpdate.notificationSettings = args.notificationSettings;
    
    if (Object.keys(listUpdate).length > 0) {
      const listResponse = await calendar.calendarList.patch({
        calendarId: args.calendarId,
        requestBody: listUpdate,
      });
      
      updates.calendarList = listResponse.data;
    }
    
    return {
      calendarId: args.calendarId,
      updated: true,
      ...updates,
    };
  } catch (error) {
    throw new CalendarError('Failed to update calendar', error);
  }
}
```

### Tool 5: `gcal_delete_calendar`
**Purpose**: Delete a secondary calendar (cannot delete primary calendar)

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "description": "Calendar identifier (cannot be 'primary')"
    },
    "removeFromList": {
      "type": "boolean",
      "description": "Only remove from list without deleting",
      "default": false
    }
  },
  "required": ["calendarId"]
}
```

**Implementation**:
```typescript
async function handleDeleteCalendar(args: DeleteCalendarArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    if (args.calendarId === 'primary') {
      throw new Error('Cannot delete primary calendar');
    }
    
    if (args.removeFromList) {
      // Only remove from calendar list
      await calendar.calendarList.delete({
        calendarId: args.calendarId,
      });
      
      return {
        calendarId: args.calendarId,
        removedFromList: true,
        deleted: false,
      };
    } else {
      // Delete the calendar entirely
      await calendar.calendars.delete({
        calendarId: args.calendarId,
      });
      
      return {
        calendarId: args.calendarId,
        deleted: true,
      };
    }
  } catch (error) {
    throw new CalendarError('Failed to delete calendar', error);
  }
}
```

### Tool 6: `gcal_clear_calendar`
**Purpose**: Remove all events from the primary calendar

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "confirm": {
      "type": "boolean",
      "description": "Confirmation required to clear all events"
    }
  },
  "required": ["confirm"]
}
```

**Implementation**:
```typescript
async function handleClearCalendar(args: ClearCalendarArgs) {
  if (!args.confirm) {
    throw new Error('Confirmation required to clear calendar');
  }
  
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    await calendar.calendars.clear({
      calendarId: 'primary',
    });
    
    return {
      calendarId: 'primary',
      cleared: true,
      message: 'All events have been removed from the primary calendar',
    };
  } catch (error) {
    throw new CalendarError('Failed to clear calendar', error);
  }
}
```

### Tool 7: `gcal_add_calendar_to_list`
**Purpose**: Subscribe to a calendar by ID or add a public calendar

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "description": "Calendar ID to add (e.g., 'en.usa#holiday@group.v.calendar.google.com' for US holidays)"
    },
    "colorId": {
      "type": "string",
      "description": "Color ID for the calendar"
    },
    "hidden": {
      "type": "boolean",
      "description": "Hide calendar initially",
      "default": false
    },
    "selected": {
      "type": "boolean",
      "description": "Select calendar in UI",
      "default": true
    }
  },
  "required": ["calendarId"]
}
```

**Implementation**:
```typescript
async function handleAddCalendarToList(args: AddCalendarToListArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const response = await calendar.calendarList.insert({
      requestBody: {
        id: args.calendarId,
        colorId: args.colorId,
        hidden: args.hidden,
        selected: args.selected,
      },
    });
    
    return {
      id: response.data.id,
      summary: response.data.summary,
      description: response.data.description,
      added: true,
    };
  } catch (error) {
    throw new CalendarError('Failed to add calendar to list', error);
  }
}
```

### Tool 8: `gcal_get_calendar_colors`
**Purpose**: Get available colors for calendars and events

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Implementation**:
```typescript
async function handleGetCalendarColors(args: {}) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const response = await calendar.colors.get();
    
    return {
      calendar: Object.entries(response.data.calendar || {}).map(([id, color]: [string, any]) => ({
        id,
        background: color.background,
        foreground: color.foreground,
      })),
      event: Object.entries(response.data.event || {}).map(([id, color]: [string, any]) => ({
        id,
        background: color.background,
        foreground: color.foreground,
      })),
    };
  } catch (error) {
    throw new CalendarError('Failed to get colors', error);
  }
}
```

### Tool 9: `gcal_get_user_settings`
**Purpose**: Get user's calendar settings and preferences

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "setting": {
      "type": "string",
      "description": "Specific setting to retrieve (optional)"
    }
  }
}
```

**Implementation**:
```typescript
async function handleGetUserSettings(args: GetUserSettingsArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    if (args.setting) {
      // Get specific setting
      const response = await calendar.settings.get({
        setting: args.setting,
      });
      
      return {
        id: response.data.id,
        value: response.data.value,
        etag: response.data.etag,
      };
    } else {
      // List all settings
      const response = await calendar.settings.list({
        maxResults: 100,
      });
      
      const settings = response.data.items || [];
      
      return {
        settings: settings.map(setting => ({
          id: setting.id,
          value: setting.value,
        })),
        timeZone: settings.find(s => s.id === 'timezone')?.value,
        locale: settings.find(s => s.id === 'locale')?.value,
        dateFieldOrder: settings.find(s => s.id === 'dateFieldOrder')?.value,
        format24HourTime: settings.find(s => s.id === 'format24HourTime')?.value === 'true',
        hideWeekends: settings.find(s => s.id === 'hideWeekends')?.value === 'true',
        weekStart: settings.find(s => s.id === 'weekStart')?.value,
      };
    }
  } catch (error) {
    throw new CalendarError('Failed to get settings', error);
  }
}
```

### Tool 10: `gcal_sync_calendars`
**Purpose**: Perform incremental sync of calendar list changes

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "syncToken": {
      "type": "string",
      "description": "Token from previous sync (optional for initial sync)"
    },
    "fullSync": {
      "type": "boolean",
      "description": "Force full sync instead of incremental",
      "default": false
    }
  }
}
```

**Implementation**:
```typescript
async function handleSyncCalendars(args: SyncCalendarsArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const params: any = {
      maxResults: 100,
    };
    
    if (!args.fullSync && args.syncToken) {
      params.syncToken = args.syncToken;
    }
    
    const response = await calendar.calendarList.list(params);
    
    return {
      calendars: response.data.items || [],
      nextSyncToken: response.data.nextSyncToken,
      changes: {
        added: response.data.items?.filter((cal: any) => !cal.deleted) || [],
        deleted: response.data.items?.filter((cal: any) => cal.deleted) || [],
      },
    };
  } catch (error) {
    if (error.code === 410) {
      // Sync token expired, need full sync
      return handleSyncCalendars({ fullSync: true });
    }
    throw new CalendarError('Failed to sync calendars', error);
  }
}
```

## Testing Strategy

### Phase 1: API Testing
```bash
# List calendars
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/calendar/v3/users/me/calendarList" > calendars_list.json

# Get specific calendar
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/calendar/v3/calendars/primary" > calendar_primary.json

# Get colors
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/calendar/v3/colors" > colors.json

# Get settings
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/calendar/v3/users/me/settings" > settings.json

# Create calendar
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"summary":"Test Calendar","timeZone":"America/New_York"}' \
  "https://www.googleapis.com/calendar/v3/calendars" > calendar_created.json
```

### Phase 2: MCP Tool Testing
```bash
# List calendars
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_list_calendars","arguments":{}},"id":1}' | node server.js

# Get calendar
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_get_calendar","arguments":{"calendarId":"primary"}},"id":2}' | node server.js

# Create calendar
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_create_calendar","arguments":{"summary":"MCP Test Calendar","description":"Created via MCP"}},"id":3}' | node server.js

# Update calendar
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_update_calendar","arguments":{"calendarId":"primary","colorId":"1"}},"id":4}' | node server.js

# Get colors
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_get_calendar_colors","arguments":{}},"id":5}' | node server.js
```

### Phase 3: Integration Testing
```bash
# Test calendar lifecycle
node -e "
const mcp = new GoogleCalendarMCP();
await mcp.initialize();

// Create calendar
const created = await mcp.callTool('gcal_create_calendar', {
  summary: 'Integration Test Calendar',
  description: 'Testing calendar operations',
  colorId: '5'
});
console.log('Created:', created);

// Update calendar
const updated = await mcp.callTool('gcal_update_calendar', {
  calendarId: created.id,
  description: 'Updated description',
  hidden: false
});
console.log('Updated:', updated);

// List calendars
const list = await mcp.callTool('gcal_list_calendars', {
  showHidden: true
});
console.log('Calendars:', list.calendars.length);

// Delete calendar
const deleted = await mcp.callTool('gcal_delete_calendar', {
  calendarId: created.id
});
console.log('Deleted:', deleted);
"
```

## Error Handling

### Calendar-Specific Errors
```typescript
class CalendarError extends Error {
  constructor(
    message: string,
    public originalError?: any,
    public calendarId?: string
  ) {
    super(message);
    this.name = 'CalendarError';
  }
}

// Error codes
const CALENDAR_ERRORS = {
  NOT_FOUND: 'calendar/not-found',
  ACCESS_DENIED: 'calendar/access-denied',
  QUOTA_EXCEEDED: 'calendar/quota-exceeded',
  INVALID_REQUEST: 'calendar/invalid-request',
  CANNOT_DELETE_PRIMARY: 'calendar/cannot-delete-primary',
};
```

### Validation
```typescript
import { z } from 'zod';

const CalendarIdSchema = z.string().min(1);
const ColorIdSchema = z.string().regex(/^\d+$/);
const TimeZoneSchema = z.string(); // Could validate against IANA timezone database

function validateCalendarId(id: string): void {
  if (id.includes('/') || id.includes('\\')) {
    throw new ValidationError('Invalid calendar ID format');
  }
}

function validateColor(color: string): void {
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new ValidationError('Invalid color format (use #RRGGBB)');
  }
}
```

## Caching Strategy

```typescript
class CalendarCache {
  private cache = new NodeCache({ stdTTL: 300 }); // 5 minutes
  
  getCacheKey(operation: string, params: any): string {
    return `${operation}:${JSON.stringify(params)}`;
  }
  
  async getCalendarList(minAccessRole?: string): Promise<any> {
    const key = this.getCacheKey('calendarList', { minAccessRole });
    let result = this.cache.get(key);
    
    if (!result) {
      result = await this.fetchCalendarList(minAccessRole);
      this.cache.set(key, result);
    }
    
    return result;
  }
  
  invalidateCalendar(calendarId: string): void {
    // Remove all cache entries for this calendar
    const keys = this.cache.keys();
    keys.forEach(key => {
      if (key.includes(calendarId)) {
        this.cache.del(key);
      }
    });
  }
}
```

## Success Criteria

### Functional Requirements
- [ ] List all calendars with filtering
- [ ] Get calendar details and metadata
- [ ] Create new secondary calendars
- [ ] Update calendar properties and colors
- [ ] Delete calendars (except primary)
- [ ] Clear primary calendar events
- [ ] Subscribe to public calendars
- [ ] Get available colors
- [ ] Retrieve user settings
- [ ] Sync calendar list changes

### Performance Requirements
- [ ] Calendar list loads in < 500ms
- [ ] Calendar creation in < 1s
- [ ] Cache hit rate > 80% for read operations
- [ ] Batch operations where applicable

### User Experience
- [ ] Clear error messages for invalid operations
- [ ] Prevent accidental primary calendar deletion
- [ ] Color preview in responses
- [ ] Time zone validation and suggestions

## Deliverables

1. **Implementation Files**:
   - `src/tools/calendar-management.ts`
   - `src/utils/calendar-cache.ts`
   - `src/validators/calendar-validators.ts`

2. **Test Files**:
   - `tests/tools/calendar-management.test.ts`
   - `tests/fixtures/calendar-responses/`

3. **Documentation**:
   - Calendar management guide
   - Public calendar IDs reference
   - Color scheme documentation

This implementation provides comprehensive calendar management capabilities as the foundation for event operations.