# Google Calendar MCP Server Overview

> **IMPLEMENTATION STATUS** (Updated 2025-11-11): This document describes the full planned architecture. The current implementation includes:
> - ✅ OAuth2 authentication (mcp-gmail pattern)
> - ✅ 17 calendar tools (basic + advanced features)
> - ✅ Natural language date parsing
> - ✅ Free/busy scheduling
> - ✅ Calendar ACL management
> - ✅ Bundle distribution (~14MB single file)
> - 🚧 Service account auth (planned, not implemented)
> - 🚧 Resources and prompts (planned, not implemented)

## Purpose
A comprehensive Model Context Protocol (MCP) server that provides LLMs with secure, production-ready access to Google Calendar functionality. This server enables AI assistants to manage calendars, schedule events, handle recurring appointments, check availability, and coordinate meetings through a well-structured set of tools, resources, and prompts.

## API Analysis

### Target API: Google Calendar API v3
- **Base URL**: `https://www.googleapis.com/calendar/v3`
- **Discovery Document**: `https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest`
- **Authentication**: OAuth2 (user auth), Service Accounts, API Keys (limited)
- **Rate Limits**: 
  - 1,000,000 queries per day (default)
  - 500 queries per 100 seconds per user
  - 50,000 queries per 100 seconds per project
- **Documentation**: https://developers.google.com/workspace/calendar/api/v3/reference

### Key API Features (2024)
- **Birthday Events**: New `eventType: "birthday"` for special all-day annual events
- **Gmail Events**: Events from Gmail use `eventType: "fromGmail"`
- **Batch Operations**: HTTP 409 Conflict for batch operation conflicts
- **Watch/Webhooks**: Real-time notifications for calendar changes
- **Extended Properties**: Private and shared custom properties
- **Conference Data**: Integration with Google Meet, Zoom, etc.

### Scope Coverage
This MCP server will provide comprehensive coverage of:

#### Calendar Management (100% coverage)
1. **CalendarList Resource**
   - List, get user's calendars
   - Insert, update, delete calendar list entries
   - Watch for calendar list changes
   - Color management and settings

2. **Calendars Resource**
   - Get, insert, update, delete calendars
   - Clear primary calendar
   - Calendar metadata management

#### Event Operations (100% coverage)
1. **Events Resource**
   - List, get, insert, update, delete events
   - Quick add with natural language
   - Move events between calendars
   - Import events from iCal
   - Instances of recurring events
   - Watch for event changes

2. **Recurring Events**
   - RRULE pattern support
   - Exception handling
   - Instance modifications
   - Series updates

3. **Attendees & Guests**
   - Guest management
   - RSVP tracking
   - Email notifications
   - Guest permissions

#### Advanced Features (90% coverage)
1. **Free/Busy Queries**
   - Check availability across calendars
   - Group scheduling
   - Time zone handling
   - Working hours consideration

2. **ACL (Access Control)**
   - List, get, insert, update, delete rules
   - Share calendars with specific permissions
   - Public calendar management

3. **Settings**
   - Get user settings
   - Notification preferences
   - Time zone settings
   - Working hours configuration

4. **Colors**
   - Calendar colors
   - Event colors
   - Custom color schemes

## MCP Architecture

### Server Capabilities
- ✅ Tools: 35+ tools planned across 5 clusters
- ✅ Resources: 6 dynamic resources for calendar context
- ✅ Prompts: 8 interactive prompts for scheduling workflows
- ✅ Logging: Structured logging with levels
- ✅ Error Handling: Comprehensive error recovery
- ✅ Rate Limiting: Built-in rate limit handling with exponential backoff
- ✅ Natural Language: Date/time parsing and intelligent scheduling

### Authentication Architecture
```
┌─────────────────────────────────────────┐
│         Authentication Manager           │
├─────────────────────────────────────────┤
│  ┌────────────┐  ┌──────────────────┐  │
│  │   OAuth2   │  │ Service Account  │  │
│  │   Client   │  │     Client       │  │
│  └────────────┘  └──────────────────┘  │
│         │               │               │
│  ┌──────────────────────────────────┐  │
│  │    Token Storage & Refresh       │  │
│  │  - Encrypted token storage       │  │
│  │  - Automatic token refresh       │  │
│  │  - Multi-account support         │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Environment Configuration
```bash
# CURRENT IMPLEMENTATION (2025-11-11)
# OAuth2 credentials are provided via credentials.json file
# Token storage: ~/.config/mcp-gcal/token.json (fixed)
# Credentials: ~/.config/mcp-gcal/credentials.json or project root

# OAuth2 via Environment Variables (optional)
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret

# Logging
GCAL_LOG_LEVEL=info  # debug, info, warn, error

# PLANNED FEATURES (not yet implemented):
# Service Account Configuration
# GCAL_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
# GCAL_IMPERSONATE_EMAIL=user@example.com

# API Configuration
# GCAL_API_KEY=optional_api_key_for_public_calendars
# GCAL_DEFAULT_CALENDAR=primary
# GCAL_DEFAULT_TIMEZONE=America/New_York

# Caching
# GCAL_CACHE_ENABLED=true
# GCAL_CACHE_TTL_SECONDS=300
# GCAL_CACHE_MAX_SIZE=100

# Webhooks (Optional)
GCAL_WEBHOOK_URL=https://your-domain.com/webhooks/calendar
GCAL_WEBHOOK_SECRET=your_webhook_secret
```

### Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "googleapis": "^144.0.0",
    "@google-cloud/local-auth": "^3.0.1",
    "google-auth-library": "^9.15.0",
    "chrono-node": "^2.7.8",
    "rrule": "^2.8.1",
    "luxon": "^3.5.0",
    "zod": "^3.24.1",
    "winston": "^3.15.0",
    "node-cache": "^5.1.2",
    "p-limit": "^6.1.0",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "vitest": "^2.1.8",
    "@types/node": "^22.10.2",
    "@types/luxon": "^3.4.2",
    "typescript": "^5.7.2",
    "tsx": "^4.19.2"
  }
}
```

## Development Approach

### 3-Phase Testing Strategy

#### Phase 1: API Testing (Direct Google Calendar API)
```bash
# Test Calendar API authentication
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     "https://www.googleapis.com/calendar/v3/users/me/calendarList"

# Test event listing
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     "https://www.googleapis.com/calendar/v3/calendars/primary/events"

# Test free/busy query
curl -X POST -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"timeMin":"2024-01-01T00:00:00Z","timeMax":"2024-01-02T00:00:00Z","items":[{"id":"primary"}]}' \
     "https://www.googleapis.com/calendar/v3/freeBusy"
```

#### Phase 2: MCP Tool Testing (stdio)
```bash
# Test MCP server tools via JSON-RPC
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_list_events","arguments":{"calendarId":"primary","maxResults":10}},"id":1}' | node server.js

# Test natural language scheduling
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"gcal_quick_add","arguments":{"text":"Meeting with team tomorrow at 2pm"}},"id":1}' | node server.js
```

#### Phase 3: Transport Testing (HTTP/SSE)
```bash
# Start HTTP server
node server.js --transport http --port 3000

# Test HTTP transport
curl -X POST http://localhost:3000/mcp/message \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

#### Phase 4: Automated Testing (Vitest)
- Use captured API responses as fixtures
- Test recurring event logic
- Validate timezone conversions
- Check conflict detection algorithms

### Key Differentiators

1. **Natural Language Processing**
   - Parse natural language dates/times using chrono-node
   - Intelligent event title extraction
   - Context-aware scheduling suggestions

2. **Intelligent Scheduling**
   - Automatic conflict detection
   - Working hours consideration
   - Travel time buffers
   - Meeting room availability

3. **Advanced Recurring Events**
   - Full RRULE support
   - Exception handling
   - Series modifications
   - Complex patterns (e.g., "every 2nd Tuesday")

4. **Meeting Assistant**
   - Find optimal meeting times
   - Send invitations with agenda
   - Track RSVPs
   - Generate meeting summaries

5. **Multi-Calendar Coordination**
   - Cross-calendar availability
   - Calendar synchronization
   - Shared calendar management
   - Team scheduling

## Task Overview

### Core Implementation Tasks
- [ ] **0001_server_setup_auth.md** - Authentication system & server foundation
- [ ] **0002_calendar_management_tools.md** - Calendar CRUD & settings
- [ ] **0003_event_operations_tools.md** - Event management & attendees
- [ ] **0004_advanced_features_tools.md** - Recurring events, free/busy, ACL
- [ ] **0005_resources_prompts.md** - Dynamic resources & interactive prompts
- [ ] **0006_readme_deployment.md** - Documentation & packaging

### Parallel Development Strategy
Each task document is designed for independent development:
- Complete API endpoint documentation
- Full request/response examples
- Independent test strategies
- Clear dependencies listed
- Success criteria defined

## Performance Optimizations

### Event Caching Strategy
```javascript
// LRU cache for frequently accessed events
const eventCache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
});

// Calendar metadata cache
const calendarCache = new LRUCache({
  max: 50,
  ttl: 1000 * 60 * 15, // 15 minutes
});
```

### Batch Operations
```javascript
// Batch event operations
const batchProcessor = new BatchProcessor({
  batchSize: 50,
  flushInterval: 1000,
  maxConcurrent: 5,
});
```

### Conflict Detection
```javascript
// Efficient conflict detection
const conflictDetector = new ConflictDetector({
  bufferTime: 5, // minutes
  considerTravelTime: true,
  workingHoursOnly: false,
});
```

## Success Metrics

### Functional Requirements
- [ ] Complete OAuth2 flow implementation
- [ ] Service account authentication
- [ ] All CRUD operations for calendars/events
- [ ] Recurring event management
- [ ] Free/busy queries
- [ ] Natural language parsing
- [ ] Conflict detection

### Performance Requirements
- [ ] < 100ms response time for cached operations
- [ ] < 500ms for event operations
- [ ] < 1s for complex availability queries
- [ ] Batch operations for efficiency
- [ ] Rate limit compliance without failures

### User Experience Requirements
- [ ] Natural language event creation
- [ ] Intelligent scheduling suggestions
- [ ] Clear conflict notifications
- [ ] Timezone handling transparency
- [ ] Helpful error messages

### Security Requirements
- [ ] Secure credential storage
- [ ] OAuth2 PKCE flow
- [ ] Audit logging for modifications
- [ ] Permission validation
- [ ] Data encryption at rest

## Risk Mitigation

### Technical Risks
1. **Token Expiry**: Automatic refresh with retry logic
2. **Rate Limiting**: Exponential backoff with jitter
3. **Timezone Issues**: Luxon for robust timezone handling
4. **Recurring Complexity**: RRule library for standards compliance

### Security Risks
1. **Credential Exposure**: Encrypted storage
2. **Calendar Hijacking**: Permission validation
3. **Data Leakage**: Output filtering
4. **CSRF Attacks**: State parameter validation

### Operational Risks
1. **API Downtime**: Graceful degradation
2. **Quota Exhaustion**: Usage monitoring
3. **Sync Issues**: Webhook reconciliation
4. **Performance**: Strategic caching

## Integration Examples

### Slack Integration
```javascript
// Schedule meeting from Slack
const slackIntegration = {
  command: "/schedule",
  handler: async (text) => {
    return await gcalMCP.tools.call('gcal_quick_add', { text });
  }
};
```

### Email Integration
```javascript
// Parse meeting requests from email
const emailIntegration = {
  trigger: "meeting request",
  handler: async (emailContent) => {
    return await gcalMCP.tools.call('gcal_schedule_meeting', {
      description: emailContent,
      findTime: true
    });
  }
};
```

## Next Steps

1. Set up Google Cloud Project and enable Calendar API
2. Configure OAuth2 consent screen with calendar scopes
3. Generate credentials (OAuth2 and/or Service Account)
4. Implement authentication manager with token storage
5. Build core calendar management tools
6. Add event operations with natural language support
7. Implement advanced features (recurring, free/busy)
8. Create resources and prompts
9. Package and deploy with platform-specific installers

This comprehensive MCP server will provide production-ready Google Calendar integration with intelligent scheduling, natural language processing, and excellent developer experience.