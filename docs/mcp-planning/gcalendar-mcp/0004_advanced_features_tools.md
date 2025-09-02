# Advanced Features Tools Implementation

## Overview
This task implements advanced calendar features including recurring event management with RRULE support, free/busy queries for scheduling, access control list (ACL) management, calendar sharing, conference/video integration, and intelligent conflict detection.

## Dependencies
- Requires completion of Task 0001 (Authentication & Server Setup)
- Requires completion of Task 0002 (Calendar Management)
- Requires completion of Task 0003 (Event Operations)
- Integrates with rrule library for recurring event patterns
- Uses luxon for timezone handling

## API Endpoints Covered

### FreeBusy Resource
#### freebusy.query
- **Method**: POST
- **URL**: `/calendar/v3/freeBusy`
- **Purpose**: Query free/busy information
- **Request Body**:
  - timeMin: Start of query period
  - timeMax: End of query period
  - timeZone: Time zone for response
  - groupExpansionMax: Maximum group members
  - calendarExpansionMax: Maximum calendars
  - items: Array of calendar/group IDs to query

### ACL Resource
#### acl.list
- **Method**: GET
- **URL**: `/calendar/v3/calendars/{calendarId}/acl`
- **Purpose**: List access control rules
- **Parameters**:
  - calendarId: Calendar identifier
  - maxResults: Maximum entries
  - pageToken: Pagination token
  - showDeleted: Include deleted ACL rules
  - syncToken: Incremental sync token

#### acl.get
- **Method**: GET
- **URL**: `/calendar/v3/calendars/{calendarId}/acl/{ruleId}`
- **Purpose**: Get specific ACL rule
- **Parameters**:
  - calendarId: Calendar identifier
  - ruleId: ACL rule identifier

#### acl.insert
- **Method**: POST
- **URL**: `/calendar/v3/calendars/{calendarId}/acl`
- **Purpose**: Create new ACL rule
- **Parameters**:
  - calendarId: Calendar identifier
  - sendNotifications: Notify grantee
- **Request Body**: ACL rule resource

#### acl.update
- **Method**: PUT
- **URL**: `/calendar/v3/calendars/{calendarId}/acl/{ruleId}`
- **Purpose**: Update ACL rule
- **Parameters**:
  - calendarId: Calendar identifier
  - ruleId: ACL rule identifier
  - sendNotifications: Notify grantee

#### acl.patch
- **Method**: PATCH
- **URL**: `/calendar/v3/calendars/{calendarId}/acl/{ruleId}`
- **Purpose**: Partial update of ACL rule

#### acl.delete
- **Method**: DELETE
- **URL**: `/calendar/v3/calendars/{calendarId}/acl/{ruleId}`
- **Purpose**: Delete ACL rule
- **Parameters**:
  - calendarId: Calendar identifier
  - ruleId: ACL rule identifier

### Recurring Events (via Events Resource)
- Uses RRULE format (RFC 5545)
- Supports complex patterns
- Exception handling for modified instances
- Series updates and deletions

### Conference Data (via Events Resource)
- Conference solution types (hangoutsMeet, addOn)
- Create conference with event
- Join URLs and access codes
- Entry points (video, phone, SIP)

## Tools to Implement

### Tool 1: `gcal_check_availability`
**Purpose**: Check free/busy times across multiple calendars for scheduling

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "timeMin": {
      "type": "string",
      "description": "Start time (ISO 8601 or natural language)"
    },
    "timeMax": {
      "type": "string",
      "description": "End time (ISO 8601 or natural language)"
    },
    "calendars": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Calendar IDs to check (default: primary)",
      "default": ["primary"]
    },
    "timeZone": {
      "type": "string",
      "description": "Time zone for response"
    },
    "includeUnavailable": {
      "type": "boolean",
      "description": "Include calendars that are unavailable",
      "default": false
    }
  },
  "required": ["timeMin", "timeMax"]
}
```

**Implementation**:
```typescript
async function handleCheckAvailability(args: CheckAvailabilityArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Parse natural language dates
    const timeMin = parseDate(args.timeMin);
    const timeMax = parseDate(args.timeMax);
    
    // Build items array
    const items = (args.calendars || ['primary']).map(id => ({ id }));
    
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: args.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        items,
      },
    });
    
    const results = [];
    
    for (const [calendarId, data] of Object.entries(response.data.calendars || {})) {
      const calData = data as any;
      results.push({
        calendarId,
        busy: calData.busy || [],
        errors: calData.errors,
      });
    }
    
    // Calculate free slots
    const freeSlots = calculateFreeSlots(timeMin, timeMax, results);
    
    return {
      timeMin,
      timeMax,
      calendars: results,
      freeSlots,
      groups: response.data.groups,
    };
  } catch (error) {
    throw new SchedulingError('Failed to check availability', error);
  }
}

function calculateFreeSlots(
  timeMin: string,
  timeMax: string,
  calendars: any[]
): any[] {
  const start = new Date(timeMin);
  const end = new Date(timeMax);
  const busyTimes = [];
  
  // Collect all busy times
  calendars.forEach(cal => {
    cal.busy.forEach((busy: any) => {
      busyTimes.push({
        start: new Date(busy.start),
        end: new Date(busy.end),
      });
    });
  });
  
  // Sort busy times
  busyTimes.sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // Merge overlapping busy times
  const merged = [];
  busyTimes.forEach(busy => {
    if (merged.length === 0) {
      merged.push(busy);
    } else {
      const last = merged[merged.length - 1];
      if (busy.start <= last.end) {
        last.end = new Date(Math.max(last.end.getTime(), busy.end.getTime()));
      } else {
        merged.push(busy);
      }
    }
  });
  
  // Calculate free slots
  const freeSlots = [];
  let currentStart = start;
  
  merged.forEach(busy => {
    if (currentStart < busy.start) {
      freeSlots.push({
        start: currentStart.toISOString(),
        end: busy.start.toISOString(),
        duration: (busy.start.getTime() - currentStart.getTime()) / (1000 * 60), // minutes
      });
    }
    currentStart = busy.end;
  });
  
  if (currentStart < end) {
    freeSlots.push({
      start: currentStart.toISOString(),
      end: end.toISOString(),
      duration: (end.getTime() - currentStart.getTime()) / (1000 * 60),
    });
  }
  
  return freeSlots;
}
```

### Tool 2: `gcal_find_meeting_time`
**Purpose**: Find optimal meeting time for multiple attendees

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "attendees": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Email addresses or calendar IDs"
    },
    "duration": {
      "type": "number",
      "description": "Meeting duration in minutes"
    },
    "timeMin": {
      "type": "string",
      "description": "Earliest possible time"
    },
    "timeMax": {
      "type": "string",
      "description": "Latest possible time"
    },
    "preferredTimes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "start": { "type": "string" },
          "end": { "type": "string" }
        }
      },
      "description": "Preferred time windows"
    },
    "workingHours": {
      "type": "object",
      "properties": {
        "start": { "type": "string", "default": "09:00" },
        "end": { "type": "string", "default": "17:00" },
        "days": {
          "type": "array",
          "items": { "type": "number" },
          "default": [1, 2, 3, 4, 5]
        }
      }
    },
    "timeZone": {
      "type": "string",
      "description": "Time zone for scheduling"
    },
    "maxResults": {
      "type": "number",
      "description": "Maximum suggestions",
      "default": 5
    }
  },
  "required": ["attendees", "duration", "timeMin", "timeMax"]
}
```

**Implementation**:
```typescript
async function handleFindMeetingTime(args: FindMeetingTimeArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Get free/busy for all attendees
    const freeBusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: parseDate(args.timeMin),
        timeMax: parseDate(args.timeMax),
        timeZone: args.timeZone,
        items: args.attendees.map(email => ({ id: email })),
      },
    });
    
    // Calculate common free slots
    const freeSlots = calculateCommonFreeSlots(
      freeBusyResponse.data,
      args.duration,
      args.workingHours
    );
    
    // Score and rank slots
    const scoredSlots = freeSlots.map(slot => ({
      ...slot,
      score: scoreTimeSlot(slot, args.preferredTimes, args.workingHours),
    }));
    
    scoredSlots.sort((a, b) => b.score - a.score);
    
    // Return top suggestions
    const suggestions = scoredSlots.slice(0, args.maxResults || 5).map(slot => ({
      start: slot.start,
      end: slot.end,
      score: slot.score,
      conflicts: slot.conflicts || [],
      allAvailable: slot.conflicts.length === 0,
      reason: explainScore(slot),
    }));
    
    return {
      suggestions,
      totalAttendees: args.attendees.length,
      duration: args.duration,
      searchWindow: {
        start: args.timeMin,
        end: args.timeMax,
      },
    };
  } catch (error) {
    throw new SchedulingError('Failed to find meeting time', error);
  }
}

function scoreTimeSlot(
  slot: any,
  preferredTimes?: any[],
  workingHours?: any
): number {
  let score = 100;
  const slotStart = new Date(slot.start);
  const hour = slotStart.getHours();
  const day = slotStart.getDay();
  
  // Prefer working hours
  if (workingHours) {
    const startHour = parseInt(workingHours.start.split(':')[0]);
    const endHour = parseInt(workingHours.end.split(':')[0]);
    
    if (hour >= startHour && hour < endHour) {
      score += 20;
    } else {
      score -= 30;
    }
    
    if (workingHours.days && !workingHours.days.includes(day)) {
      score -= 50;
    }
  }
  
  // Prefer mid-morning and mid-afternoon
  if (hour >= 10 && hour <= 11) score += 15;
  if (hour >= 14 && hour <= 15) score += 15;
  
  // Avoid early morning and late evening
  if (hour < 9) score -= 20;
  if (hour > 17) score -= 20;
  
  // Check preferred times
  if (preferredTimes) {
    preferredTimes.forEach(preferred => {
      if (isWithinWindow(slot, preferred)) {
        score += 30;
      }
    });
  }
  
  return Math.max(0, score);
}
```

### Tool 3: `gcal_create_recurring_event`
**Purpose**: Create complex recurring events with RRULE patterns

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "default": "primary"
    },
    "summary": {
      "type": "string",
      "description": "Event title"
    },
    "description": {
      "type": "string"
    },
    "location": {
      "type": "string"
    },
    "start": {
      "type": "object",
      "description": "First occurrence start time"
    },
    "end": {
      "type": "object",
      "description": "First occurrence end time"
    },
    "recurrence": {
      "type": "object",
      "properties": {
        "frequency": {
          "type": "string",
          "enum": ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
          "description": "Recurrence frequency"
        },
        "interval": {
          "type": "number",
          "description": "Interval between occurrences",
          "default": 1
        },
        "count": {
          "type": "number",
          "description": "Number of occurrences"
        },
        "until": {
          "type": "string",
          "description": "End date for recurrence"
        },
        "byDay": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Days of week (MO, TU, WE, TH, FR, SA, SU)"
        },
        "byMonthDay": {
          "type": "array",
          "items": { "type": "number" },
          "description": "Days of month (1-31)"
        },
        "byMonth": {
          "type": "array",
          "items": { "type": "number" },
          "description": "Months (1-12)"
        },
        "bySetPos": {
          "type": "number",
          "description": "Occurrence within set (-1 for last)"
        }
      },
      "required": ["frequency"]
    },
    "exceptions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "date": { "type": "string" },
          "cancelled": { "type": "boolean" },
          "modified": { "type": "object" }
        }
      },
      "description": "Exception dates or modifications"
    },
    "attendees": {
      "type": "array",
      "items": { "type": "object" }
    },
    "reminders": {
      "type": "object"
    }
  },
  "required": ["summary", "start", "end", "recurrence"]
}
```

**Implementation**:
```typescript
import { RRule } from 'rrule';

async function handleCreateRecurringEvent(args: CreateRecurringEventArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Build RRULE string
    const rrule = buildRRule(args.recurrence);
    
    // Create base event with recurrence
    const event: any = {
      summary: args.summary,
      description: args.description,
      location: args.location,
      start: parseEventTime(args.start),
      end: parseEventTime(args.end),
      recurrence: [rrule],
      attendees: args.attendees,
      reminders: args.reminders || { useDefault: true },
    };
    
    // Create the recurring event
    const response = await calendar.events.insert({
      calendarId: args.calendarId || 'primary',
      requestBody: event,
      sendNotifications: true,
    });
    
    // Handle exceptions if provided
    if (args.exceptions && args.exceptions.length > 0) {
      await handleExceptions(
        calendar,
        args.calendarId || 'primary',
        response.data.id!,
        args.exceptions
      );
    }
    
    // Generate preview of occurrences
    const rule = RRule.fromString(rrule);
    const occurrences = rule.all((date, i) => i < 10); // First 10 occurrences
    
    return {
      id: response.data.id,
      summary: response.data.summary,
      recurrence: response.data.recurrence,
      htmlLink: response.data.htmlLink,
      created: true,
      pattern: describeRecurrence(args.recurrence),
      nextOccurrences: occurrences.map(date => date.toISOString()),
    };
  } catch (error) {
    throw new RecurrenceError('Failed to create recurring event', error);
  }
}

function buildRRule(recurrence: any): string {
  const parts = [`FREQ=${recurrence.frequency}`];
  
  if (recurrence.interval && recurrence.interval > 1) {
    parts.push(`INTERVAL=${recurrence.interval}`);
  }
  
  if (recurrence.count) {
    parts.push(`COUNT=${recurrence.count}`);
  } else if (recurrence.until) {
    const until = new Date(recurrence.until);
    parts.push(`UNTIL=${until.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
  }
  
  if (recurrence.byDay && recurrence.byDay.length > 0) {
    parts.push(`BYDAY=${recurrence.byDay.join(',')}`);
  }
  
  if (recurrence.byMonthDay && recurrence.byMonthDay.length > 0) {
    parts.push(`BYMONTHDAY=${recurrence.byMonthDay.join(',')}`);
  }
  
  if (recurrence.byMonth && recurrence.byMonth.length > 0) {
    parts.push(`BYMONTH=${recurrence.byMonth.join(',')}`);
  }
  
  if (recurrence.bySetPos) {
    parts.push(`BYSETPOS=${recurrence.bySetPos}`);
  }
  
  return `RRULE:${parts.join(';')}`;
}

function describeRecurrence(recurrence: any): string {
  let description = '';
  
  switch (recurrence.frequency) {
    case 'DAILY':
      description = recurrence.interval > 1 
        ? `Every ${recurrence.interval} days`
        : 'Daily';
      break;
    case 'WEEKLY':
      description = recurrence.interval > 1
        ? `Every ${recurrence.interval} weeks`
        : 'Weekly';
      if (recurrence.byDay) {
        description += ` on ${recurrence.byDay.join(', ')}`;
      }
      break;
    case 'MONTHLY':
      description = recurrence.interval > 1
        ? `Every ${recurrence.interval} months`
        : 'Monthly';
      if (recurrence.byMonthDay) {
        description += ` on day ${recurrence.byMonthDay.join(', ')}`;
      }
      if (recurrence.bySetPos) {
        description += recurrence.bySetPos === -1 ? ' (last)' : ` (${recurrence.bySetPos})`;
      }
      break;
    case 'YEARLY':
      description = recurrence.interval > 1
        ? `Every ${recurrence.interval} years`
        : 'Yearly';
      break;
  }
  
  if (recurrence.count) {
    description += `, ${recurrence.count} times`;
  } else if (recurrence.until) {
    description += `, until ${new Date(recurrence.until).toLocaleDateString()}`;
  }
  
  return description;
}
```

### Tool 4: `gcal_update_recurring_event`
**Purpose**: Update recurring event series or specific instances

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
      "description": "Recurring event ID"
    },
    "updateScope": {
      "type": "string",
      "enum": ["this", "thisAndFollowing", "all"],
      "description": "Scope of update",
      "default": "all"
    },
    "instanceDate": {
      "type": "string",
      "description": "Date of specific instance (for 'this' or 'thisAndFollowing')"
    },
    "updates": {
      "type": "object",
      "description": "Event properties to update"
    },
    "sendNotifications": {
      "type": "boolean",
      "default": true
    }
  },
  "required": ["eventId", "updates"]
}
```

**Implementation**:
```typescript
async function handleUpdateRecurringEvent(args: UpdateRecurringEventArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    let targetEventId = args.eventId;
    
    // Handle instance-specific updates
    if (args.updateScope !== 'all' && args.instanceDate) {
      // Get instances to find the specific one
      const instances = await calendar.events.instances({
        calendarId: args.calendarId || 'primary',
        eventId: args.eventId,
        timeMin: args.instanceDate,
        maxResults: 1,
      });
      
      if (instances.data.items && instances.data.items.length > 0) {
        targetEventId = instances.data.items[0].id!;
        
        if (args.updateScope === 'thisAndFollowing') {
          // Split the series
          await splitRecurringSeries(
            calendar,
            args.calendarId || 'primary',
            targetEventId,
            args.updates
          );
          return {
            eventId: targetEventId,
            updateScope: args.updateScope,
            message: 'Series split and future events updated',
          };
        }
      }
    }
    
    // Update the event or series
    const response = await calendar.events.patch({
      calendarId: args.calendarId || 'primary',
      eventId: targetEventId,
      requestBody: args.updates,
      sendNotifications: args.sendNotifications !== false,
      sendUpdates: 'all',
    });
    
    return {
      eventId: response.data.id,
      updateScope: args.updateScope,
      updated: true,
      summary: response.data.summary,
      message: `Recurring event updated (scope: ${args.updateScope})`,
    };
  } catch (error) {
    throw new RecurrenceError('Failed to update recurring event', error);
  }
}
```

### Tool 5: `gcal_share_calendar`
**Purpose**: Share calendar with specific users or make it public

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "description": "Calendar to share",
      "default": "primary"
    },
    "scope": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["default", "user", "group", "domain"],
          "description": "Scope type"
        },
        "value": {
          "type": "string",
          "description": "Email, group, or domain (not needed for 'default')"
        }
      },
      "required": ["type"]
    },
    "role": {
      "type": "string",
      "enum": ["none", "freeBusyReader", "reader", "writer", "owner"],
      "description": "Access level"
    },
    "sendNotifications": {
      "type": "boolean",
      "description": "Notify the grantee",
      "default": true
    }
  },
  "required": ["scope", "role"]
}
```

**Implementation**:
```typescript
async function handleShareCalendar(args: ShareCalendarArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const rule: any = {
      scope: args.scope,
      role: args.role,
    };
    
    const response = await calendar.acl.insert({
      calendarId: args.calendarId || 'primary',
      requestBody: rule,
      sendNotifications: args.sendNotifications !== false,
    });
    
    // Get calendar details for confirmation
    const calendarInfo = await calendar.calendars.get({
      calendarId: args.calendarId || 'primary',
    });
    
    return {
      ruleId: response.data.id,
      calendarId: args.calendarId || 'primary',
      calendarName: calendarInfo.data.summary,
      scope: response.data.scope,
      role: response.data.role,
      etag: response.data.etag,
      shared: true,
      message: `Calendar shared with ${args.scope.value || 'public'} as ${args.role}`,
    };
  } catch (error) {
    throw new SharingError('Failed to share calendar', error);
  }
}
```

### Tool 6: `gcal_list_calendar_permissions`
**Purpose**: List all access control rules for a calendar

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
    "showDeleted": {
      "type": "boolean",
      "description": "Include deleted rules",
      "default": false
    }
  }
}
```

**Implementation**:
```typescript
async function handleListCalendarPermissions(args: ListPermissionsArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const response = await calendar.acl.list({
      calendarId: args.calendarId || 'primary',
      showDeleted: args.showDeleted,
    });
    
    const rules = response.data.items || [];
    
    return {
      calendarId: args.calendarId || 'primary',
      permissions: rules.map(rule => ({
        id: rule.id,
        role: rule.role,
        scope: rule.scope,
        etag: rule.etag,
      })),
      defaultAccess: rules.find(r => r.scope?.type === 'default'),
      publicAccess: rules.some(r => r.scope?.type === 'default'),
      totalRules: rules.length,
    };
  } catch (error) {
    throw new PermissionError('Failed to list permissions', error);
  }
}
```

### Tool 7: `gcal_revoke_calendar_access`
**Purpose**: Remove access permissions from a calendar

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "default": "primary"
    },
    "ruleId": {
      "type": "string",
      "description": "ACL rule ID to remove"
    },
    "scope": {
      "type": "object",
      "properties": {
        "type": { "type": "string" },
        "value": { "type": "string" }
      },
      "description": "Alternative: identify by scope"
    }
  }
}
```

**Implementation**:
```typescript
async function handleRevokeCalendarAccess(args: RevokeAccessArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    let ruleId = args.ruleId;
    
    // Find rule by scope if not provided
    if (!ruleId && args.scope) {
      const rules = await calendar.acl.list({
        calendarId: args.calendarId || 'primary',
      });
      
      const rule = rules.data.items?.find(r => 
        r.scope?.type === args.scope?.type &&
        r.scope?.value === args.scope?.value
      );
      
      if (!rule) {
        throw new Error('No matching rule found for scope');
      }
      
      ruleId = rule.id!;
    }
    
    if (!ruleId) {
      throw new Error('Either ruleId or scope must be provided');
    }
    
    await calendar.acl.delete({
      calendarId: args.calendarId || 'primary',
      ruleId,
    });
    
    return {
      calendarId: args.calendarId || 'primary',
      ruleId,
      revoked: true,
      message: 'Access revoked successfully',
    };
  } catch (error) {
    throw new PermissionError('Failed to revoke access', error);
  }
}
```

### Tool 8: `gcal_add_conference`
**Purpose**: Add video conferencing to an event

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
      "description": "Event to add conference to"
    },
    "conferenceType": {
      "type": "string",
      "enum": ["hangoutsMeet", "addOn"],
      "description": "Conference solution type",
      "default": "hangoutsMeet"
    },
    "requestId": {
      "type": "string",
      "description": "Unique request ID (auto-generated if not provided)"
    }
  },
  "required": ["eventId"]
}
```

**Implementation**:
```typescript
async function handleAddConference(args: AddConferenceArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    // Get current event
    const event = await calendar.events.get({
      calendarId: args.calendarId || 'primary',
      eventId: args.eventId,
    });
    
    // Add conference data
    const conferenceData = {
      createRequest: {
        requestId: args.requestId || generateRequestId(),
        conferenceSolutionKey: {
          type: args.conferenceType || 'hangoutsMeet',
        },
      },
    };
    
    // Update event with conference
    const response = await calendar.events.patch({
      calendarId: args.calendarId || 'primary',
      eventId: args.eventId,
      requestBody: { conferenceData },
      conferenceDataVersion: 1,
      sendNotifications: true,
      sendUpdates: 'all',
    });
    
    return {
      eventId: args.eventId,
      conferenceData: response.data.conferenceData,
      joinUrl: response.data.conferenceData?.entryPoints?.find(
        e => e.entryPointType === 'video'
      )?.uri,
      dialIn: response.data.conferenceData?.entryPoints?.filter(
        e => e.entryPointType === 'phone'
      ),
      added: true,
      message: 'Conference added to event',
    };
  } catch (error) {
    throw new ConferenceError('Failed to add conference', error);
  }
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

### Tool 9: `gcal_detect_conflicts`
**Purpose**: Detect scheduling conflicts for a proposed event

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "calendarId": {
      "type": "string",
      "default": "primary"
    },
    "start": {
      "type": "string",
      "description": "Proposed start time"
    },
    "end": {
      "type": "string",
      "description": "Proposed end time"
    },
    "excludeEventId": {
      "type": "string",
      "description": "Event ID to exclude (for updates)"
    },
    "bufferMinutes": {
      "type": "number",
      "description": "Buffer time between events",
      "default": 0
    },
    "checkAttendees": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Check conflicts for these attendees"
    }
  },
  "required": ["start", "end"]
}
```

**Implementation**:
```typescript
async function handleDetectConflicts(args: DetectConflictsArgs) {
  const auth = await this.authManager.getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const start = parseDate(args.start);
    const end = parseDate(args.end);
    
    // Add buffer time
    const bufferMs = (args.bufferMinutes || 0) * 60 * 1000;
    const checkStart = new Date(new Date(start).getTime() - bufferMs).toISOString();
    const checkEnd = new Date(new Date(end).getTime() + bufferMs).toISOString();
    
    // Check primary calendar
    const conflicts = [];
    
    const events = await calendar.events.list({
      calendarId: args.calendarId || 'primary',
      timeMin: checkStart,
      timeMax: checkEnd,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const conflictingEvents = (events.data.items || []).filter(event => {
      if (event.id === args.excludeEventId) return false;
      if (event.transparency === 'transparent') return false; // Available time
      
      const eventStart = new Date(event.start?.dateTime || event.start?.date!);
      const eventEnd = new Date(event.end?.dateTime || event.end?.date!);
      
      return (eventStart < new Date(end) && eventEnd > new Date(start));
    });
    
    conflicts.push({
      calendarId: args.calendarId || 'primary',
      conflicts: conflictingEvents.map(e => ({
        id: e.id,
        summary: e.summary,
        start: e.start,
        end: e.end,
        attendees: e.attendees?.length || 0,
      })),
    });
    
    // Check attendee calendars if requested
    if (args.checkAttendees && args.checkAttendees.length > 0) {
      const freeBusy = await calendar.freebusy.query({
        requestBody: {
          timeMin: checkStart,
          timeMax: checkEnd,
          items: args.checkAttendees.map(email => ({ id: email })),
        },
      });
      
      for (const [email, data] of Object.entries(freeBusy.data.calendars || {})) {
        const busyData = data as any;
        if (busyData.busy && busyData.busy.length > 0) {
          conflicts.push({
            calendarId: email,
            conflicts: busyData.busy.map((busy: any) => ({
              start: busy.start,
              end: busy.end,
              type: 'busy',
            })),
          });
        }
      }
    }
    
    const hasConflicts = conflicts.some(c => c.conflicts.length > 0);
    
    return {
      hasConflicts,
      conflicts,
      proposedTime: { start, end },
      suggestion: hasConflicts ? await suggestAlternativeTime(args) : null,
    };
  } catch (error) {
    throw new ConflictError('Failed to detect conflicts', error);
  }
}
```

## Testing Strategy

### Phase 1: API Testing
```bash
# Free/busy query
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timeMin": "2024-01-15T00:00:00Z",
    "timeMax": "2024-01-16T00:00:00Z",
    "items": [{"id": "primary"}]
  }' \
  "https://www.googleapis.com/calendar/v3/freeBusy" > freebusy.json

# List ACL rules
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/calendar/v3/calendars/primary/acl" > acl_list.json

# Create recurring event with RRULE
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Weekly Meeting",
    "start": {"dateTime": "2024-01-15T10:00:00-05:00"},
    "end": {"dateTime": "2024-01-15T11:00:00-05:00"},
    "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10"]
  }' \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events" > recurring_event.json
```

### Phase 2: MCP Tool Testing
```bash
# Check availability
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_check_availability","arguments":{"timeMin":"tomorrow 9am","timeMax":"tomorrow 5pm","calendars":["primary"]}},"id":1}' | node server.js

# Find meeting time
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_find_meeting_time","arguments":{"attendees":["user1@example.com","user2@example.com"],"duration":60,"timeMin":"next week","timeMax":"in 2 weeks"}},"id":2}' | node server.js

# Create recurring event
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_create_recurring_event","arguments":{"summary":"Daily Standup","start":{"dateTime":"2024-01-15T09:00:00-05:00"},"end":{"dateTime":"2024-01-15T09:15:00-05:00"},"recurrence":{"frequency":"WEEKLY","byDay":["MO","TU","WE","TH","FR"]}}},"id":3}' | node server.js
```

### Phase 3: Complex Scenario Testing
```javascript
// Test conflict detection with buffer time
const conflicts = await mcp.callTool('gcal_detect_conflicts', {
  start: 'tomorrow at 2pm',
  end: 'tomorrow at 3pm',
  bufferMinutes: 15,
  checkAttendees: ['colleague@example.com'],
});

// Test recurring event with exceptions
const recurring = await mcp.callTool('gcal_create_recurring_event', {
  summary: 'Team Sync',
  start: { dateTime: '2024-01-15T14:00:00Z' },
  end: { dateTime: '2024-01-15T15:00:00Z' },
  recurrence: {
    frequency: 'WEEKLY',
    byDay: ['MO', 'WE'],
    count: 20,
  },
  exceptions: [
    { date: '2024-01-22', cancelled: true }, // Skip one occurrence
    { date: '2024-01-29', modified: { location: 'Remote' } }, // Modify one
  ],
});
```

## Error Handling

### Advanced Feature Errors
```typescript
class SchedulingError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'SchedulingError';
  }
}

class RecurrenceError extends Error {
  constructor(message: string, public pattern?: string) {
    super(message);
    this.name = 'RecurrenceError';
  }
}

class SharingError extends Error {
  constructor(message: string, public scope?: any) {
    super(message);
    this.name = 'SharingError';
  }
}

class ConflictError extends Error {
  constructor(message: string, public conflicts?: any[]) {
    super(message);
    this.name = 'ConflictError';
  }
}
```

## Success Criteria

### Functional Requirements
- [ ] Free/busy queries across calendars
- [ ] Intelligent meeting time suggestions
- [ ] Complex recurring event patterns
- [ ] Recurring event modifications
- [ ] Calendar sharing and permissions
- [ ] Conference integration
- [ ] Conflict detection with buffers
- [ ] ACL management

### Performance Requirements
- [ ] Free/busy queries < 1s
- [ ] Meeting suggestions < 2s
- [ ] Conflict detection < 500ms
- [ ] Batch ACL operations

### User Experience
- [ ] Natural recurrence descriptions
- [ ] Smart conflict resolution
- [ ] Clear sharing confirmations
- [ ] Helpful scheduling suggestions

## Deliverables

1. **Implementation Files**:
   - `src/tools/advanced-features.ts`
   - `src/utils/scheduling-helper.ts`
   - `src/utils/recurrence-helper.ts`
   - `src/utils/conflict-detector.ts`

2. **Test Files**:
   - `tests/tools/advanced-features.test.ts`
   - `tests/utils/scheduling.test.ts`
   - `tests/fixtures/freebusy-responses/`

3. **Documentation**:
   - RRULE pattern guide
   - Scheduling best practices
   - Sharing and permissions guide

This implementation provides enterprise-grade scheduling and calendar management capabilities.