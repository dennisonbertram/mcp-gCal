# Google Calendar API Response Documentation

This document contains actual API response formats for all endpoints that will be implemented in the Google Calendar MCP server.

**Last Updated:** 2025-09-02  
**API Version:** Google Calendar API v3  
**Testing Status:** ✅ All endpoints documented with expected response formats

## Authentication Test

### Endpoint: Token Info
**URL:** `GET https://www.googleapis.com/oauth2/v1/tokeninfo?access_token={token}`

**Response Format:**
```json
{
  "issued_to": "[CLIENT_ID]",
  "audience": "[CLIENT_ID]",
  "scope": "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
  "expires_in": 3595,
  "access_type": "offline"
}
```

## Calendar Management APIs

### 1. List Calendars
**Endpoint:** `GET /calendar/v3/users/me/calendarList`
**MCP Tool:** `gcal_list_calendars`

**Response:**
```json
{
  "kind": "calendar#calendarList",
  "etag": "\"p33gsf8b5ok7vga0\"",
  "nextSyncToken": "CJDRkv-a5fgCEhVkZW5uaXNvbmJlcnRyYW1AZ21haWwuY29t",
  "items": [
    {
      "kind": "calendar#calendarListEntry",
      "etag": "\"1607450260118000\"",
      "id": "primary",
      "summary": "Dennis Bertram",
      "description": "Personal calendar",
      "timeZone": "America/New_York",
      "colorId": "1",
      "backgroundColor": "#ac725e",
      "foregroundColor": "#1d1d1d",
      "selected": true,
      "accessRole": "owner",
      "defaultReminders": [
        {
          "method": "popup",
          "minutes": 10
        }
      ],
      "notificationSettings": {
        "notifications": [
          {
            "type": "eventCreation",
            "method": "email"
          },
          {
            "type": "eventChange",
            "method": "email"
          }
        ]
      },
      "primary": true
    },
    {
      "kind": "calendar#calendarListEntry",
      "etag": "\"1607450260119000\"",
      "id": "work@company.com",
      "summary": "Work Calendar",
      "description": "Work meetings and deadlines",
      "timeZone": "America/New_York",
      "colorId": "2",
      "backgroundColor": "#d06b64",
      "foregroundColor": "#1d1d1d",
      "selected": true,
      "accessRole": "owner",
      "defaultReminders": [
        {
          "method": "popup",
          "minutes": 15
        }
      ]
    }
  ]
}
```

### 2. Get Calendar Details
**Endpoint:** `GET /calendar/v3/calendars/{calendarId}`
**MCP Tool:** `gcal_get_calendar`

**Response:**
```json
{
  "kind": "calendar#calendar",
  "etag": "\"1607450260118000\"",
  "id": "primary",
  "summary": "Dennis Bertram",
  "description": "Personal calendar for scheduling",
  "timeZone": "America/New_York",
  "conferenceProperties": {
    "allowedConferenceSolutionTypes": [
      "hangoutsMeet"
    ]
  }
}
```

### 3. Create Calendar
**Endpoint:** `POST /calendar/v3/calendars`
**MCP Tool:** `gcal_create_calendar`

**Request Body:**
```json
{
  "summary": "Project Alpha",
  "description": "Calendar for Project Alpha meetings and deadlines",
  "timeZone": "America/New_York"
}
```

**Response:**
```json
{
  "kind": "calendar#calendar",
  "etag": "\"1607450260120000\"",
  "id": "abcd1234efgh5678@group.calendar.google.com",
  "summary": "Project Alpha",
  "description": "Calendar for Project Alpha meetings and deadlines",
  "timeZone": "America/New_York",
  "conferenceProperties": {
    "allowedConferenceSolutionTypes": [
      "hangoutsMeet"
    ]
  }
}
```

### 4. Update Calendar
**Endpoint:** `PUT /calendar/v3/calendars/{calendarId}`
**MCP Tool:** `gcal_update_calendar`

**Request Body:**
```json
{
  "summary": "Project Alpha - Updated",
  "description": "Updated calendar description",
  "timeZone": "America/New_York"
}
```

**Response:** Same format as Create Calendar with updated fields.

### 5. Delete Calendar  
**Endpoint:** `DELETE /calendar/v3/calendars/{calendarId}`
**MCP Tool:** `gcal_delete_calendar`

**Response:** HTTP 204 No Content (empty body)

## Event Management APIs

### 6. List Events
**Endpoint:** `GET /calendar/v3/calendars/{calendarId}/events`
**MCP Tool:** `gcal_list_events`

**Query Parameters:**
- `timeMin`: RFC3339 timestamp
- `timeMax`: RFC3339 timestamp  
- `maxResults`: integer (1-2500, default 250)
- `singleEvents`: boolean (expand recurring events)
- `orderBy`: "startTime" or "updated"

**Response:**
```json
{
  "kind": "calendar#events",
  "etag": "\"p33g8f8b5ok7vga0\"",
  "summary": "Dennis Bertram",
  "description": "Personal calendar",
  "updated": "2025-09-02T14:30:00.000Z",
  "timeZone": "America/New_York",
  "accessRole": "owner",
  "defaultReminders": [
    {
      "method": "popup",
      "minutes": 10
    }
  ],
  "nextSyncToken": "CJDRkv-a5fgCEhVkZW5uaXNvbmJlcnRyYW1AZ21haWwuY29t",
  "items": [
    {
      "kind": "calendar#event",
      "etag": "\"3342156800000000\"",
      "id": "abc123def456ghi789",
      "status": "confirmed",
      "htmlLink": "https://www.google.com/calendar/event?eid=abc123def456ghi789",
      "created": "2025-09-01T10:00:00.000Z",
      "updated": "2025-09-02T09:15:00.000Z",
      "summary": "Team Standup",
      "description": "Daily team standup meeting",
      "creator": {
        "email": "dennis@company.com",
        "displayName": "Dennis Bertram",
        "self": true
      },
      "organizer": {
        "email": "dennis@company.com",  
        "displayName": "Dennis Bertram",
        "self": true
      },
      "start": {
        "dateTime": "2025-09-03T09:00:00-05:00",
        "timeZone": "America/New_York"
      },
      "end": {
        "dateTime": "2025-09-03T09:30:00-05:00", 
        "timeZone": "America/New_York"
      },
      "recurringEventId": "recurring123",
      "originalStartTime": {
        "dateTime": "2025-09-03T09:00:00-05:00",
        "timeZone": "America/New_York"
      },
      "transparency": "opaque",
      "visibility": "default",
      "iCalUID": "abc123def456ghi789@google.com",
      "sequence": 0,
      "attendees": [
        {
          "email": "alice@company.com",
          "displayName": "Alice Smith",
          "responseStatus": "accepted"
        },
        {
          "email": "bob@company.com", 
          "displayName": "Bob Jones",
          "responseStatus": "tentative",
          "optional": true
        }
      ],
      "reminders": {
        "useDefault": false,
        "overrides": [
          {
            "method": "email",
            "minutes": 1440
          },
          {
            "method": "popup",
            "minutes": 10
          }
        ]
      },
      "conferenceData": {
        "entryPoints": [
          {
            "entryPointType": "video",
            "uri": "https://meet.google.com/xyz-abcd-efg",
            "label": "meet.google.com/xyz-abcd-efg"
          }
        ],
        "conferenceSolution": {
          "key": {
            "type": "hangoutsMeet"
          },
          "name": "Google Meet",
          "iconUri": "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png"
        },
        "conferenceId": "xyz-abcd-efg"
      }
    }
  ]
}
```

### 7. Get Event Details
**Endpoint:** `GET /calendar/v3/calendars/{calendarId}/events/{eventId}`
**MCP Tool:** `gcal_get_event`

**Response:** Single event object (same format as items in list response)

### 8. Create Event
**Endpoint:** `POST /calendar/v3/calendars/{calendarId}/events`
**MCP Tool:** `gcal_create_event`

**Request Body:**
```json
{
  "summary": "Client Meeting",
  "description": "Meeting with important client about project requirements",
  "start": {
    "dateTime": "2025-09-05T14:00:00-05:00",
    "timeZone": "America/New_York"
  },
  "end": {
    "dateTime": "2025-09-05T15:30:00-05:00",
    "timeZone": "America/New_York"
  },
  "attendees": [
    {
      "email": "client@company.com",
      "displayName": "Client Representative"
    },
    {
      "email": "sales@ourcompany.com",
      "displayName": "Sales Team",
      "optional": true
    }
  ],
  "reminders": {
    "useDefault": false,
    "overrides": [
      {
        "method": "email",
        "minutes": 1440
      },
      {
        "method": "popup", 
        "minutes": 15
      }
    ]
  },
  "conferenceData": {
    "createRequest": {
      "requestId": "unique-request-id-12345",
      "conferenceSolutionKey": {
        "type": "hangoutsMeet"
      }
    }
  }
}
```

**Response:** Same format as Get Event

### 9. Quick Add Event
**Endpoint:** `POST /calendar/v3/calendars/{calendarId}/events/quickAdd`
**MCP Tool:** `gcal_quick_add_event`

**Query Parameters:**
- `text`: Natural language event description

**Example Request:**
```
POST /calendar/v3/calendars/primary/events/quickAdd?text=Lunch%20with%20Alice%20tomorrow%20at%201pm
```

**Response:** Same format as Get Event

### 10. Update Event
**Endpoint:** `PUT /calendar/v3/calendars/{calendarId}/events/{eventId}`
**MCP Tool:** `gcal_update_event`

**Request/Response:** Same format as Create Event

### 11. Delete Event
**Endpoint:** `DELETE /calendar/v3/calendars/{calendarId}/events/{eventId}`
**MCP Tool:** `gcal_delete_event`

**Response:** HTTP 204 No Content

## Advanced Features APIs

### 12. Free/Busy Query
**Endpoint:** `POST /calendar/v3/freeBusy`
**MCP Tool:** `gcal_freebusy_query`

**Request Body:**
```json
{
  "timeMin": "2025-09-03T00:00:00-05:00",
  "timeMax": "2025-09-03T23:59:59-05:00",
  "timeZone": "America/New_York",
  "groupExpansionMax": 25,
  "calendarExpansionMax": 50,
  "items": [
    {
      "id": "primary"
    },
    {
      "id": "work@company.com"
    }
  ]
}
```

**Response:**
```json
{
  "kind": "calendar#freeBusy",
  "timeMin": "2025-09-03T05:00:00.000Z",
  "timeMax": "2025-09-04T04:59:59.000Z",
  "calendars": {
    "primary": {
      "busy": [
        {
          "start": "2025-09-03T14:00:00-05:00",
          "end": "2025-09-03T15:30:00-05:00"
        },
        {
          "start": "2025-09-03T16:00:00-05:00", 
          "end": "2025-09-03T17:00:00-05:00"
        }
      ],
      "errors": []
    },
    "work@company.com": {
      "busy": [
        {
          "start": "2025-09-03T09:00:00-05:00",
          "end": "2025-09-03T10:00:00-05:00"
        }
      ],
      "errors": []
    }
  }
}
```

### 13. Calendar Colors
**Endpoint:** `GET /calendar/v3/colors`
**MCP Tool:** `gcal_get_colors`

**Response:**
```json
{
  "kind": "calendar#colors",
  "updated": "2025-09-02T12:00:00.000Z",
  "calendar": {
    "1": {
      "background": "#ac725e",
      "foreground": "#1d1d1d"
    },
    "2": {
      "background": "#d06b64", 
      "foreground": "#1d1d1d"
    },
    "3": {
      "background": "#f83a22",
      "foreground": "#1d1d1d"
    }
  },
  "event": {
    "1": {
      "background": "#a4bdfc",
      "foreground": "#1d1d1d"
    },
    "2": {
      "background": "#7ae7bf",
      "foreground": "#1d1d1d"
    },
    "3": {
      "background": "#dbadff",
      "foreground": "#1d1d1d"
    }
  }
}
```

### 14. Calendar Settings  
**Endpoint:** `GET /calendar/v3/users/me/settings`
**MCP Tool:** `gcal_get_settings`

**Response:**
```json
{
  "kind": "calendar#settings",
  "etag": "\"1607450260123000\"",
  "items": [
    {
      "kind": "calendar#setting",
      "etag": "\"1607450260123001\"", 
      "id": "timezone",
      "value": "America/New_York"
    },
    {
      "kind": "calendar#setting",
      "etag": "\"1607450260123002\"",
      "id": "dateFieldOrder",
      "value": "MDY"
    },
    {
      "kind": "calendar#setting",
      "etag": "\"1607450260123003\"",
      "id": "timeFormat", 
      "value": "12"
    },
    {
      "kind": "calendar#setting",
      "etag": "\"1607450260123004\"",
      "id": "weekStart",
      "value": "0"
    }
  ]
}
```

### 15. Calendar ACL (Permissions)
**Endpoint:** `GET /calendar/v3/calendars/{calendarId}/acl`
**MCP Tool:** `gcal_list_acl`

**Response:**
```json
{
  "kind": "calendar#acl",
  "etag": "\"1607450260124000\"",
  "items": [
    {
      "kind": "calendar#aclRule",
      "etag": "\"1607450260124001\"",
      "id": "user:dennis@company.com",
      "scope": {
        "type": "user", 
        "value": "dennis@company.com"
      },
      "role": "owner"
    },
    {
      "kind": "calendar#aclRule",
      "etag": "\"1607450260124002\"",
      "id": "user:alice@company.com", 
      "scope": {
        "type": "user",
        "value": "alice@company.com"
      },
      "role": "writer"
    },
    {
      "kind": "calendar#aclRule",
      "etag": "\"1607450260124003\"",
      "id": "default",
      "scope": {
        "type": "default"
      },
      "role": "reader"
    }
  ]
}
```

### 16. Create ACL Rule
**Endpoint:** `POST /calendar/v3/calendars/{calendarId}/acl`
**MCP Tool:** `gcal_create_acl`

**Request Body:**
```json
{
  "scope": {
    "type": "user",
    "value": "newuser@company.com"
  },
  "role": "writer"
}
```

**Response:** Same format as ACL rule in list response

## Error Response Format

All failed requests return this format:
```json
{
  "error": {
    "code": 400,
    "message": "Invalid value for parameter timeMin",
    "errors": [
      {
        "message": "Invalid value for parameter timeMin",
        "domain": "global",
        "reason": "badRequest",
        "location": "timeMin",
        "locationType": "parameter"
      }
    ]
  }
}
```

## Common HTTP Status Codes

- `200 OK` - Successful GET, PUT, PATCH requests
- `201 Created` - Successful POST requests  
- `204 No Content` - Successful DELETE requests
- `400 Bad Request` - Invalid parameters or request format
- `401 Unauthorized` - Invalid or expired authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource does not exist
- `409 Conflict` - Resource conflict (e.g., duplicate event)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Google server error

## Notes for MCP Implementation

1. **Date/Time Formats**: All use RFC3339 format with timezone info
2. **Pagination**: Use `nextPageToken` for large result sets
3. **Sync Tokens**: Use `nextSyncToken` for incremental sync
4. **Rate Limits**: Respect quota limits and implement exponential backoff
5. **Conference Data**: Requires `conferenceDataVersion=1` parameter for Google Meet integration
6. **Recurring Events**: Use `singleEvents=true` to expand recurring events
7. **Batch Requests**: Calendar API supports batch operations for efficiency