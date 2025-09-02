# Event Operations Tools Implementation

## Overview
This task implements comprehensive event management operations including creating, reading, updating, deleting events, managing attendees, handling reminders, and supporting natural language event creation. This is the core functionality for calendar event manipulation.

## Dependencies
- Requires completion of Task 0001 (Authentication & Server Setup)
- Requires completion of Task 0002 (Calendar Management) for calendar context
- Integrates with chrono-node for natural language parsing

## API Endpoints Covered

### Events Resource
#### events.list
- **Method**: GET
- **URL**: `/calendar/v3/calendars/{calendarId}/events`
- **Purpose**: List events from a calendar
- **Parameters**:
  - calendarId: Calendar identifier
  - alwaysIncludeEmail: Include creator email
  - eventTypes: Filter by event type (default, outOfOffice, focusTime, fromGmail, birthday)
  - iCalUID: Filter by iCalendar UID
  - maxAttendees: Maximum attendees to include
  - maxResults: Maximum events (1-2500)
  - orderBy: Sort order (startTime, updated)
  - pageToken: Pagination token
  - privateExtendedProperty: Filter by private properties
  - q: Free text search
  - sharedExtendedProperty: Filter by shared properties
  - showDeleted: Include deleted events
  - showHiddenInvitations: Include hidden invitations
  - singleEvents: Expand recurring events
  - timeMax: Upper bound for event start time
  - timeMin: Lower bound for event start time
  - timeZone: Time zone for time parameters
  - updatedMin: Lower bound for modification time

#### events.get
- **Method**: GET
- **URL**: `/calendar/v3/calendars/{calendarId}/events/{eventId}`
- **Purpose**: Get specific event
- **Parameters**:
  - calendarId: Calendar identifier
  - eventId: Event identifier
  - alwaysIncludeEmail: Include creator email
  - maxAttendees: Maximum attendees to include
  - timeZone: Time zone for response

#### events.insert
- **Method**: POST
- **URL**: `/calendar/v3/calendars/{calendarId}/events`
- **Purpose**: Create new event
- **Parameters**:
  - calendarId: Calendar identifier
  - conferenceDataVersion: Version for conference support (0 or 1)
  - maxAttendees: Maximum attendees
  - sendNotifications: Send notifications to attendees
  - sendUpdates: Who to send updates to (all, externalOnly, none)
  - supportsAttachments: Whether attachments are supported
- **Request Body**: Event resource

#### events.quickAdd
- **Method**: POST
- **URL**: `/calendar/v3/calendars/{calendarId}/events/quickAdd`
- **Purpose**: Create event from natural language
- **Parameters**:
  - calendarId: Calendar identifier
  - text: Natural language text
  - sendNotifications: Send notifications
  - sendUpdates: Who to send updates to

#### events.update
- **Method**: PUT
- **URL**: `/calendar/v3/calendars/{calendarId}/events/{eventId}`
- **Purpose**: Update entire event
- **Parameters**:
  - calendarId: Calendar identifier
  - eventId: Event identifier
  - alwaysIncludeEmail: Include creator email
  - conferenceDataVersion: Conference support version
  - maxAttendees: Maximum attendees
  - sendNotifications: Send notifications
  - sendUpdates: Who to send updates to
  - supportsAttachments: Attachment support
- **Request Body**: Complete event resource

#### events.patch
- **Method**: PATCH
- **URL**: `/calendar/v3/calendars/{calendarId}/events/{eventId}`
- **Purpose**: Partial event update
- **Parameters**: Same as update
- **Request Body**: Partial event resource

#### events.delete
- **Method**: DELETE
- **URL**: `/calendar/v3/calendars/{calendarId}/events/{eventId}`
- **Purpose**: Delete event
- **Parameters**:
  - calendarId: Calendar identifier
  - eventId: Event identifier
  - sendNotifications: Send cancellation notifications
  - sendUpdates: Who to send updates to

#### events.move
- **Method**: POST
- **URL**: `/calendar/v3/calendars/{calendarId}/events/{eventId}/move`
- **Purpose**: Move event to another calendar
- **Parameters**:
  - calendarId: Source calendar
  - eventId: Event identifier
  - destination: Target calendar ID

#### events.instances
- **Method**: GET
- **URL**: `/calendar/v3/calendars/{calendarId}/events/{eventId}/instances`
- **Purpose**: List instances of recurring event
- **Parameters**: Similar to events.list

#### events.import
- **Method**: POST
- **URL**: `/calendar/v3/calendars/{calendarId}/events/import`
- **Purpose**: Import event with specific ID
- **Parameters**:
  - calendarId: Calendar identifier
  - conferenceDataVersion: Conference support
  - supportsAttachments: Attachment support
- **Request Body**: Event with iCalUID

#### events.watch
- **Method**: POST
- **URL**: `/calendar/v3/calendars/{calendarId}/events/watch`
- **Purpose**: Watch for changes to events
- **Request Body**: Channel configuration

## Tools to Implement

### Tool 1: `gcal_list_events`
**Purpose**: List events from a calendar with comprehensive filtering

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "description": "Calendar ID (default: 'primary')",
      "default": "primary"
    },
    "timeMin": {
      "type": "string",
      "description": "Start time (ISO 8601 or natural language)"
    },
    "timeMax": {
      "type": "string",
      "description": "End time (ISO 8601 or natural language)"
    },
    "query": {
      "type": "string",
      "description": "Free text search query"
    },
    "maxResults": {
      "type": "number",
      "description": "Maximum events to return (1-2500)",
      "default": 100
    },
    "singleEvents": {
      "type": "boolean",
      "description": "Expand recurring events",
      "default": true
    },
    "orderBy": {
      "type": "string",
      "enum": ["startTime", "updated"],
      "description": "Sort order"
    },
    "eventTypes": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["default", "outOfOffice", "focusTime", "fromGmail", "birthday"]
      },
      "description": "Filter by event types"
    },
    "showDeleted": {
      "type": "boolean",
      "description": "Include deleted events",
      "default": false
    },
    "pageToken": {
      "type": "string",
      "description": "Pagination token"
    }
  }
}
```

**Implementation**:
```typescript
async function handleListEvents(args: ListEventsArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Parse natural language dates if provided
    let timeMin = args.timeMin;
    let timeMax = args.timeMax;
    
    if (timeMin && !isISO8601(timeMin)) {
      timeMin = chrono.parseDate(timeMin)?.toISOString();
    }
    if (timeMax && !isISO8601(timeMax)) {
      timeMax = chrono.parseDate(timeMax)?.toISOString();
    }
    
    const response = await calendar.events.list({
      calendarId: args.calendarId || 'primary',
      timeMin,
      timeMax,
      q: args.query,
      maxResults: args.maxResults || 100,
      singleEvents: args.singleEvents !== false,
      orderBy: args.orderBy,
      eventTypes: args.eventTypes?.join(','),
      showDeleted: args.showDeleted,
      pageToken: args.pageToken,
    });
    
    const events = response.data.items || [];
    
    return {
      events: events.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        allDay: !event.start?.dateTime,
        status: event.status,
        organizer: event.organizer,
        attendees: event.attendees?.map(a => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus,
          optional: a.optional,
        })),
        recurrence: event.recurrence,
        recurringEventId: event.recurringEventId,
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
        conferenceData: event.conferenceData,
        reminders: event.reminders,
        attachments: event.attachments,
        created: event.created,
        updated: event.updated,
      })),
      nextPageToken: response.data.nextPageToken,
      timeZone: response.data.timeZone,
      accessRole: response.data.accessRole,
    };
  } catch (error) {
    throw new EventError('Failed to list events', error);
  }
}
```

### Tool 2: `gcal_get_event`
**Purpose**: Get detailed information about a specific event

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "description": "Calendar ID",
      "default": "primary"
    },
    "eventId": {
      "type": "string",
      "description": "Event identifier"
    },
    "timeZone": {
      "type": "string",
      "description": "Time zone for date/time values"
    }
  },
  "required": ["eventId"]
}
```

**Implementation**:
```typescript
async function handleGetEvent(args: GetEventArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const response = await calendar.events.get({
      calendarId: args.calendarId || 'primary',
      eventId: args.eventId,
      timeZone: args.timeZone,
      alwaysIncludeEmail: true,
    });
    
    return {
      ...response.data,
      // Add computed properties
      duration: calculateDuration(response.data.start, response.data.end),
      isRecurring: !!response.data.recurrence,
      isAllDay: !response.data.start?.dateTime,
      hasAttendees: (response.data.attendees?.length || 0) > 0,
      hasConference: !!response.data.conferenceData,
    };
  } catch (error) {
    throw new EventError('Failed to get event', error);
  }
}
```

### Tool 3: `gcal_create_event`
**Purpose**: Create a new calendar event with full configuration

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "description": "Calendar ID",
      "default": "primary"
    },
    "summary": {
      "type": "string",
      "description": "Event title"
    },
    "description": {
      "type": "string",
      "description": "Event description"
    },
    "location": {
      "type": "string",
      "description": "Event location"
    },
    "start": {
      "type": "object",
      "properties": {
        "dateTime": { "type": "string" },
        "date": { "type": "string" },
        "timeZone": { "type": "string" }
      },
      "description": "Start time (dateTime for timed, date for all-day)"
    },
    "end": {
      "type": "object",
      "properties": {
        "dateTime": { "type": "string" },
        "date": { "type": "string" },
        "timeZone": { "type": "string" }
      },
      "description": "End time"
    },
    "attendees": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "email": { "type": "string" },
          "displayName": { "type": "string" },
          "optional": { "type": "boolean" },
          "responseStatus": {
            "type": "string",
            "enum": ["needsAction", "declined", "tentative", "accepted"]
          }
        }
      }
    },
    "reminders": {
      "type": "object",
      "properties": {
        "useDefault": { "type": "boolean" },
        "overrides": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "method": {
                "type": "string",
                "enum": ["email", "popup", "sms"]
              },
              "minutes": { "type": "number" }
            }
          }
        }
      }
    },
    "recurrence": {
      "type": "array",
      "items": { "type": "string" },
      "description": "RRULE strings for recurring events"
    },
    "conferenceData": {
      "type": "object",
      "properties": {
        "createRequest": {
          "type": "object",
          "properties": {
            "requestId": { "type": "string" },
            "conferenceSolutionKey": {
              "type": "object",
              "properties": {
                "type": {
                  "type": "string",
                  "enum": ["hangoutsMeet", "addOn"]
                }
              }
            }
          }
        }
      },
      "description": "Conference/video call settings"
    },
    "visibility": {
      "type": "string",
      "enum": ["default", "public", "private", "confidential"]
    },
    "transparency": {
      "type": "string",
      "enum": ["opaque", "transparent"],
      "description": "Show as busy (opaque) or available (transparent)"
    },
    "colorId": {
      "type": "string",
      "description": "Event color ID"
    },
    "sendNotifications": {
      "type": "boolean",
      "description": "Send notifications to attendees",
      "default": true
    },
    "sendUpdates": {
      "type": "string",
      "enum": ["all", "externalOnly", "none"],
      "default": "all"
    }
  },
  "required": ["summary", "start", "end"]
}
```

**Implementation**:
```typescript
async function handleCreateEvent(args: CreateEventArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Parse natural language dates if needed
    const start = parseEventTime(args.start);
    const end = parseEventTime(args.end);
    
    // Build event object
    const event: any = {
      summary: args.summary,
      description: args.description,
      location: args.location,
      start,
      end,
      attendees: args.attendees,
      reminders: args.reminders || { useDefault: true },
      recurrence: args.recurrence,
      visibility: args.visibility,
      transparency: args.transparency,
      colorId: args.colorId,
    };
    
    // Add conference data if requested
    if (args.conferenceData) {
      event.conferenceData = args.conferenceData;
    }
    
    const response = await calendar.events.insert({
      calendarId: args.calendarId || 'primary',
      requestBody: event,
      sendNotifications: args.sendNotifications !== false,
      sendUpdates: args.sendUpdates || 'all',
      conferenceDataVersion: args.conferenceData ? 1 : 0,
    });
    
    return {
      id: response.data.id,
      summary: response.data.summary,
      htmlLink: response.data.htmlLink,
      hangoutLink: response.data.hangoutLink,
      start: response.data.start,
      end: response.data.end,
      created: true,
      message: `Event "${response.data.summary}" created successfully`,
    };
  } catch (error) {
    throw new EventError('Failed to create event', error);
  }
}
```

### Tool 4: `gcal_quick_add`
**Purpose**: Create event from natural language text

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "description": "Natural language text (e.g., 'Meeting with John tomorrow at 2pm')"
    },
    "calendarId": {
      "type": "string",
      "description": "Calendar ID",
      "default": "primary"
    },
    "sendNotifications": {
      "type": "boolean",
      "description": "Send notifications",
      "default": true
    }
  },
  "required": ["text"]
}
```

**Implementation**:
```typescript
async function handleQuickAdd(args: QuickAddArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Enhance with chrono-node parsing for better understanding
    const parsedDate = chrono.parse(args.text);
    let enhancedText = args.text;
    
    if (parsedDate.length > 0) {
      // Add explicit date/time if found
      const start = parsedDate[0].start.date();
      enhancedText = `${args.text} on ${start.toLocaleString()}`;
    }
    
    const response = await calendar.events.quickAdd({
      calendarId: args.calendarId || 'primary',
      text: enhancedText,
      sendNotifications: args.sendNotifications !== false,
    });
    
    return {
      id: response.data.id,
      summary: response.data.summary,
      start: response.data.start,
      end: response.data.end,
      htmlLink: response.data.htmlLink,
      created: true,
      originalText: args.text,
      interpretedAs: enhancedText,
    };
  } catch (error) {
    throw new EventError('Failed to quick add event', error);
  }
}
```

### Tool 5: `gcal_update_event`
**Purpose**: Update an existing event

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "description": "Calendar ID",
      "default": "primary"
    },
    "eventId": {
      "type": "string",
      "description": "Event identifier"
    },
    "updates": {
      "type": "object",
      "description": "Event properties to update (same as create)"
    },
    "sendNotifications": {
      "type": "boolean",
      "default": true
    },
    "sendUpdates": {
      "type": "string",
      "enum": ["all", "externalOnly", "none"],
      "default": "all"
    }
  },
  "required": ["eventId", "updates"]
}
```

**Implementation**:
```typescript
async function handleUpdateEvent(args: UpdateEventArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Get current event
    const currentEvent = await calendar.events.get({
      calendarId: args.calendarId || 'primary',
      eventId: args.eventId,
    });
    
    // Merge updates
    const updatedEvent = {
      ...currentEvent.data,
      ...args.updates,
    };
    
    // Handle special cases
    if (args.updates.start) {
      updatedEvent.start = parseEventTime(args.updates.start);
    }
    if (args.updates.end) {
      updatedEvent.end = parseEventTime(args.updates.end);
    }
    
    const response = await calendar.events.update({
      calendarId: args.calendarId || 'primary',
      eventId: args.eventId,
      requestBody: updatedEvent,
      sendNotifications: args.sendNotifications !== false,
      sendUpdates: args.sendUpdates || 'all',
    });
    
    return {
      id: response.data.id,
      summary: response.data.summary,
      updated: true,
      changes: Object.keys(args.updates),
      message: `Event "${response.data.summary}" updated successfully`,
    };
  } catch (error) {
    throw new EventError('Failed to update event', error);
  }
}
```

### Tool 6: `gcal_delete_event`
**Purpose**: Delete an event from calendar

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "description": "Calendar ID",
      "default": "primary"
    },
    "eventId": {
      "type": "string",
      "description": "Event identifier"
    },
    "sendNotifications": {
      "type": "boolean",
      "description": "Send cancellation notifications",
      "default": true
    },
    "sendUpdates": {
      "type": "string",
      "enum": ["all", "externalOnly", "none"],
      "default": "all"
    }
  },
  "required": ["eventId"]
}
```

**Implementation**:
```typescript
async function handleDeleteEvent(args: DeleteEventArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Get event details before deletion for confirmation
    const event = await calendar.events.get({
      calendarId: args.calendarId || 'primary',
      eventId: args.eventId,
    });
    
    await calendar.events.delete({
      calendarId: args.calendarId || 'primary',
      eventId: args.eventId,
      sendNotifications: args.sendNotifications !== false,
      sendUpdates: args.sendUpdates || 'all',
    });
    
    return {
      eventId: args.eventId,
      deleted: true,
      summary: event.data.summary,
      message: `Event "${event.data.summary}" deleted successfully`,
    };
  } catch (error) {
    throw new EventError('Failed to delete event', error);
  }
}
```

### Tool 7: `gcal_move_event`
**Purpose**: Move event to another calendar

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "sourceCalendarId": {
      "type": "string",
      "description": "Source calendar ID",
      "default": "primary"
    },
    "eventId": {
      "type": "string",
      "description": "Event identifier"
    },
    "destinationCalendarId": {
      "type": "string",
      "description": "Destination calendar ID"
    },
    "sendNotifications": {
      "type": "boolean",
      "default": true
    }
  },
  "required": ["eventId", "destinationCalendarId"]
}
```

**Implementation**:
```typescript
async function handleMoveEvent(args: MoveEventArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const response = await calendar.events.move({
      calendarId: args.sourceCalendarId || 'primary',
      eventId: args.eventId,
      destination: args.destinationCalendarId,
      sendNotifications: args.sendNotifications !== false,
    });
    
    return {
      id: response.data.id,
      summary: response.data.summary,
      moved: true,
      from: args.sourceCalendarId || 'primary',
      to: args.destinationCalendarId,
      message: `Event moved to ${args.destinationCalendarId}`,
    };
  } catch (error) {
    throw new EventError('Failed to move event', error);
  }
}
```

### Tool 8: `gcal_list_instances`
**Purpose**: List instances of a recurring event

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "description": "Calendar ID",
      "default": "primary"
    },
    "eventId": {
      "type": "string",
      "description": "Recurring event ID"
    },
    "timeMin": {
      "type": "string",
      "description": "Start time for instances"
    },
    "timeMax": {
      "type": "string",
      "description": "End time for instances"
    },
    "maxResults": {
      "type": "number",
      "default": 50
    }
  },
  "required": ["eventId"]
}
```

**Implementation**:
```typescript
async function handleListInstances(args: ListInstancesArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const response = await calendar.events.instances({
      calendarId: args.calendarId || 'primary',
      eventId: args.eventId,
      timeMin: args.timeMin ? parseDate(args.timeMin) : undefined,
      timeMax: args.timeMax ? parseDate(args.timeMax) : undefined,
      maxResults: args.maxResults || 50,
    });
    
    const instances = response.data.items || [];
    
    return {
      recurringEventId: args.eventId,
      instances: instances.map(instance => ({
        id: instance.id,
        summary: instance.summary,
        start: instance.start,
        end: instance.end,
        status: instance.status,
        originalStartTime: instance.originalStartTime,
      })),
      count: instances.length,
      nextPageToken: response.data.nextPageToken,
    };
  } catch (error) {
    throw new EventError('Failed to list instances', error);
  }
}
```

### Tool 9: `gcal_manage_attendees`
**Purpose**: Add, remove, or update event attendees

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "default": "primary"
    },
    "eventId": {
      "type": "string",
      "description": "Event identifier"
    },
    "action": {
      "type": "string",
      "enum": ["add", "remove", "update"],
      "description": "Action to perform"
    },
    "attendees": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "email": { "type": "string" },
          "displayName": { "type": "string" },
          "optional": { "type": "boolean" },
          "responseStatus": {
            "type": "string",
            "enum": ["needsAction", "declined", "tentative", "accepted"]
          },
          "comment": { "type": "string" }
        }
      }
    },
    "sendNotifications": {
      "type": "boolean",
      "default": true
    }
  },
  "required": ["eventId", "action", "attendees"]
}
```

**Implementation**:
```typescript
async function handleManageAttendees(args: ManageAttendeesArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Get current event
    const event = await calendar.events.get({
      calendarId: args.calendarId || 'primary',
      eventId: args.eventId,
    });
    
    let attendees = event.data.attendees || [];
    
    switch (args.action) {
      case 'add':
        // Add new attendees
        args.attendees.forEach(newAttendee => {
          if (!attendees.find(a => a.email === newAttendee.email)) {
            attendees.push(newAttendee);
          }
        });
        break;
        
      case 'remove':
        // Remove attendees
        const emailsToRemove = args.attendees.map(a => a.email);
        attendees = attendees.filter(a => !emailsToRemove.includes(a.email));
        break;
        
      case 'update':
        // Update existing attendees
        args.attendees.forEach(update => {
          const index = attendees.findIndex(a => a.email === update.email);
          if (index >= 0) {
            attendees[index] = { ...attendees[index], ...update };
          }
        });
        break;
    }
    
    // Update event with new attendees
    const response = await calendar.events.patch({
      calendarId: args.calendarId || 'primary',
      eventId: args.eventId,
      requestBody: { attendees },
      sendNotifications: args.sendNotifications !== false,
      sendUpdates: 'all',
    });
    
    return {
      eventId: args.eventId,
      action: args.action,
      attendees: response.data.attendees,
      totalAttendees: response.data.attendees?.length || 0,
      message: `Attendees ${args.action}ed successfully`,
    };
  } catch (error) {
    throw new EventError('Failed to manage attendees', error);
  }
}
```

### Tool 10: `gcal_set_reminders`
**Purpose**: Configure event reminders

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "default": "primary"
    },
    "eventId": {
      "type": "string",
      "description": "Event identifier"
    },
    "useDefault": {
      "type": "boolean",
      "description": "Use calendar default reminders"
    },
    "reminders": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "method": {
            "type": "string",
            "enum": ["email", "popup", "sms"],
            "description": "Reminder method"
          },
          "minutes": {
            "type": "number",
            "description": "Minutes before event"
          }
        }
      }
    }
  },
  "required": ["eventId"]
}
```

**Implementation**:
```typescript
async function handleSetReminders(args: SetRemindersArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const reminders: any = {
      useDefault: args.useDefault || false,
    };
    
    if (!args.useDefault && args.reminders) {
      reminders.overrides = args.reminders;
    }
    
    const response = await calendar.events.patch({
      calendarId: args.calendarId || 'primary',
      eventId: args.eventId,
      requestBody: { reminders },
    });
    
    return {
      eventId: args.eventId,
      reminders: response.data.reminders,
      updated: true,
      message: 'Reminders updated successfully',
    };
  } catch (error) {
    throw new EventError('Failed to set reminders', error);
  }
}
```

## Natural Language Processing

### Date/Time Parsing Helper
```typescript
import * as chrono from 'chrono-node';
import { DateTime } from 'luxon';

function parseEventTime(input: any): any {
  // Already properly formatted
  if (typeof input === 'object' && (input.dateTime || input.date)) {
    return input;
  }
  
  // Parse string input
  if (typeof input === 'string') {
    // Check if it's an all-day event indicator
    if (input.toLowerCase().includes('all day')) {
      const parsed = chrono.parseDate(input);
      if (parsed) {
        return {
          date: DateTime.fromJSDate(parsed).toISODate(),
        };
      }
    }
    
    // Try ISO 8601 first
    if (isISO8601(input)) {
      return { dateTime: input };
    }
    
    // Use chrono for natural language
    const parsed = chrono.parseDate(input);
    if (parsed) {
      return {
        dateTime: parsed.toISOString(),
      };
    }
  }
  
  throw new Error(`Unable to parse date/time: ${input}`);
}

function calculateDuration(start: any, end: any): number {
  const startTime = start.dateTime ? new Date(start.dateTime) : new Date(start.date);
  const endTime = end.dateTime ? new Date(end.dateTime) : new Date(end.date);
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60); // Duration in minutes
}
```

## Testing Strategy

### Phase 1: API Testing
```bash
# List events
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10" > events_list.json

# Quick add
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events/quickAdd?text=Meeting%20tomorrow%20at%202pm" > event_quickadd.json

# Create event
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test Event",
    "start": {"dateTime": "2024-01-15T10:00:00-05:00"},
    "end": {"dateTime": "2024-01-15T11:00:00-05:00"}
  }' \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events" > event_created.json
```

### Phase 2: MCP Tool Testing
```bash
# List events
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_list_events","arguments":{"timeMin":"today","timeMax":"tomorrow"}},"id":1}' | node server.js

# Quick add with natural language
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_quick_add","arguments":{"text":"Coffee with Sarah next Tuesday at 3pm"}},"id":2}' | node server.js

# Create detailed event
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_create_event","arguments":{"summary":"Team Meeting","start":{"dateTime":"2024-01-20T14:00:00-05:00"},"end":{"dateTime":"2024-01-20T15:00:00-05:00"},"attendees":[{"email":"team@example.com"}]}},"id":3}' | node server.js
```

### Phase 3: Natural Language Testing
```javascript
// Test natural language parsing
const testCases = [
  "Meeting tomorrow at 2pm",
  "Lunch next Friday",
  "Conference call in 30 minutes",
  "Birthday party on June 15th at 7pm",
  "Weekly standup every Monday at 10am",
];

for (const text of testCases) {
  const result = await mcp.callTool('gcal_quick_add', { text });
  console.log(`"${text}" -> ${result.interpretedAs}`);
}
```

## Error Handling

### Event-Specific Errors
```typescript
class EventError extends Error {
  constructor(
    message: string,
    public originalError?: any,
    public eventId?: string,
    public calendarId?: string
  ) {
    super(message);
    this.name = 'EventError';
  }
}

const EVENT_ERRORS = {
  NOT_FOUND: 'event/not-found',
  CONFLICT: 'event/conflict',
  INVALID_TIME: 'event/invalid-time',
  PAST_EVENT: 'event/past-event',
  ATTENDEE_LIMIT: 'event/attendee-limit',
  RECURRING_ERROR: 'event/recurring-error',
};
```

## Success Criteria

### Functional Requirements
- [ ] List events with filtering and search
- [ ] Get detailed event information
- [ ] Create events with all properties
- [ ] Quick add from natural language
- [ ] Update events and send notifications
- [ ] Delete events with cancellations
- [ ] Move events between calendars
- [ ] Manage attendees and RSVPs
- [ ] Configure reminders
- [ ] Handle recurring events

### Performance Requirements
- [ ] Event operations complete in < 1s
- [ ] Natural language parsing in < 100ms
- [ ] Batch operations for multiple events
- [ ] Efficient pagination handling

### User Experience
- [ ] Natural language understanding
- [ ] Clear confirmation messages
- [ ] Helpful error messages
- [ ] Timezone awareness

## Deliverables

1. **Implementation Files**:
   - `src/tools/event-operations.ts`
   - `src/utils/date-parser.ts`
   - `src/utils/event-helpers.ts`

2. **Test Files**:
   - `tests/tools/event-operations.test.ts`
   - `tests/utils/date-parser.test.ts`
   - `tests/fixtures/event-responses/`

3. **Documentation**:
   - Event management guide
   - Natural language examples
   - Recurring event patterns

This implementation provides comprehensive event management with natural language support.