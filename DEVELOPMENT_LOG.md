# Google Calendar MCP Server - Development Log

## Project Overview
Comprehensive Google Calendar integration for Model Context Protocol (MCP) with advanced scheduling, natural language processing, and collaboration features.

## Implementation Progress

### Auth Refactoring - Gmail-MCP Pattern Adoption (2025-11-11)
**BREAKING CHANGE**: Refactored authentication to match mcp-gmail pattern

#### Changes Made
1. **New Authentication Files**:
   - `src/auth/local-auth-helper.ts` - Custom OAuth2 helper with enhanced logging and error handling
   - `src/auth/index.ts` - Main auth module exports
   - `src/cli/authenticate.ts` - Standalone authentication CLI script

2. **Removed Files**:
   - `src/auth-cli.ts` - Replaced by new CLI structure
   - `src/auth/TokenStorage.ts` - No longer needed with new auth pattern

3. **Path Consolidation**:
   - All auth files now in `~/.config/mcp-gcal/` (credentials.json, token.json)
   - Consistent with XDG base directory convention
   - Token format: "authorized_user" with refresh_token only

4. **Random Port Selection**:
   - Uses ports 50000-60000 (randomly selected) to prevent conflicts
   - Automatic retry with new port on EADDRINUSE error
   - More robust than fixed port 3000

5. **Enhanced Error Handling**:
   - Better logging throughout auth flow
   - HTML success/error pages in browser
   - Timeout handling (5 minutes)
   - Port conflict detection and helpful error messages

6. **Authentication Command**:
   - Run: `npm run auth` for local development
   - Run: `gcalendar-mcp auth` for global installation
   - Run: `npx @modelcontextprotocol/gcalendar-mcp auth` for npx usage

7. **Bundle Feature**:
   - Added `npm run build:bundle` command
   - Creates single-file bundle at `dist/gcalendar-mcp.bundle.cjs` (~14MB)
   - Self-contained with all dependencies
   - Includes all 17 tools
   - Useful for simplified deployment and distribution

#### Testing Results
- ✅ Authentication flow working with random ports
- ✅ Token storage in ~/.config/mcp-gcal/token.json
- ✅ Token refresh working correctly
- ✅ All 17 tools functional after refactoring
- ✅ Bundle build successful (14MB)

#### Alignment
This pattern matches mcp-gmail and mcp-framework authentication best practices, ensuring consistency across Model Context Protocol servers.

### Authentication Migration (2025-09-02)
**CRITICAL**: OAuth2 Out-of-Band (OOB) Flow Deprecation

#### Issue Discovered
- Google deprecated `urn:ietf:wg:oauth:2.0:oob` redirect URI
- Error: "The out-of-band (OOB) flow has been blocked in order to keep users secure"
- Authentication was failing with Error 400: invalid_request

#### Solution Implemented
**Context7 Research**: Used Context7 to analyze Google Auth Library documentation and discovered the migration path.

**Changes Made**:
1. **Updated redirect URI**: `urn:ietf:wg:oauth:2.0:oob` → `http://localhost:3000/oauth2callback`
2. **Fixed auth-cli.ts**: Replaced ES module incompatible `require.main === module` with `import.meta.url === file://${process.argv[1]}`
3. **Updated OAuth2Client**: Uses localhost callback server on port 3000
4. **Google Cloud Console**: Added `http://localhost:3000/oauth2callback` to authorized redirect URIs
5. **Credentials storage**: Standardized to `~/.config/mcp-gcal/` following XDG base directory convention

#### Authentication Flow (Final)
1. **Pre-authentication**: Server requires valid credentials before starting
2. **OAuth2 Setup**: Loads client credentials from `~/.config/mcp-gcal/credentials.json`
3. **Browser Launch**: Automatically opens Google OAuth consent page
4. **Callback Server**: Temporary server on localhost:3000 captures authorization code
5. **Token Exchange**: Exchanges code for access/refresh tokens
6. **Secure Storage**: Saves tokens to `~/.config/mcp-gcal/token.json`
7. **Verification**: Tests API access by listing calendars

#### Testing Results
- ✅ Authentication successful with new "Claude CEO" project
- ✅ Found 4 calendars (Holidays US/Argentina/Dominican Republic, DAOcember)
- ✅ Created test event via MCP protocol: "Test the MCP server works - tomorrow at 3pm"
- ✅ Server fully functional with all 17 tools

#### Alignment Note
**IMPORTANT**: This localhost callback pattern should be adopted by mcp-gDrive project to ensure consistent authentication across MCP servers. The OOB deprecation affects all Google OAuth2 implementations.

## Implementation Progress

### Phase 1: Foundation (Complete)
- **AuthManager**: Full OAuth2 authentication with Google Calendar API
- **Basic Calendar Tools** (5 tools):
  - list-calendars
  - get-calendar
  - create-calendar
  - update-calendar
  - delete-calendar
- **Event Operations** (5 tools):
  - list-events
  - get-event
  - create-event
  - update-event
  - delete-event

### Phase 2: Advanced Features (Complete)
**Date**: 2025-09-02

#### Natural Language Processing
- **Package**: chrono-node v2.8.4
- **Features**:
  - Natural language date/time parsing
  - Timezone detection and normalization
  - Duration extraction
  - All-day event detection
  - Date range parsing

#### Advanced Calendar Tools (7 tools)
1. **gcal-freebusy-query**
   - Check availability across multiple calendars
   - Uses calendar.freebusy.query() API
   - Supports natural language time ranges
   - Handles multiple calendar IDs (comma/semicolon/space separated)
   - Returns structured busy time data

2. **gcal-find-available-time**
   - Smart meeting time finder with conflict detection
   - Analyzes free/busy data across calendars
   - Respects working hours constraints
   - Configurable duration and search range
   - Returns ranked time slot suggestions
   - Algorithm: Iterates through time slots, checks conflicts, filters by working hours

3. **gcal-quick-add-event**
   - Natural language event creation
   - Uses calendar.events.quickAdd() API
   - Detects timezone from text
   - Examples: "Meeting with John tomorrow at 2pm EST"
   - Returns parsed event with detected components

4. **gcal-list-calendar-acl**
   - List calendar sharing permissions
   - Uses calendar.acl.list() API
   - Shows all users/groups with access
   - Includes role information (owner, writer, reader, freeBusyReader)

5. **gcal-create-calendar-acl**
   - Share calendar with users/groups
   - Uses calendar.acl.insert() API
   - Supports multiple scope types (user, group, domain, default)
   - Configurable notification sending
   - Role-based access control

6. **gcal-update-calendar-acl**
   - Modify existing sharing permissions
   - Uses calendar.acl.patch() API
   - Updates role levels
   - Preserves existing scope configuration

7. **gcal-delete-calendar-acl**
   - Remove calendar sharing access
   - Uses calendar.acl.delete() API
   - Supports notification configuration
   - Clean permission revocation

#### Testing Coverage
- **Unit Tests**: Complete test suites for all advanced tools
- **Date Parser Tests**: Comprehensive natural language parsing tests
- **Error Handling**: Full coverage of API error scenarios
- **Edge Cases**: Timezone handling, all-day events, working hours

### Architecture Decisions

#### Natural Language Processing
- Chose chrono-node for its robust parsing capabilities
- Implemented custom timezone normalization for common abbreviations
- Added duration extraction for meeting scheduling
- Separated parsing logic into reusable utility module

#### Smart Scheduling Algorithm
- Free/busy aggregation across multiple calendars
- Time slot generation with configurable increments (15 minutes)
- Working hours filtering with customizable boundaries
- Conflict detection using overlap checking
- Efficient sorting and ranking of available slots

#### Permission Management
- Full ACL CRUD operations
- Support for all Google Calendar scope types
- Granular role-based access control
- Optional notification management

### Performance Optimizations
- Batch calendar ID parsing for multi-calendar operations
- Efficient time slot iteration with early termination
- Minimal API calls through smart data aggregation
- Reusable authentication across tool invocations

### Security Considerations
- No hardcoded credentials or API keys
- Secure OAuth2 token management
- Input validation for all parameters
- Proper error message sanitization
- Permission validation before operations

### Known Limitations
- Maximum 2500 events per list operation (Google API limit)
- Free/busy queries limited to authenticated calendars
- Natural language parsing accuracy depends on input clarity
- Working hours are applied uniformly across all days

### Future Enhancements
- Recurring event pattern detection
- Meeting room resource management
- Calendar event templates
- Bulk event operations
- Advanced recurrence rule parsing
- Meeting analytics and insights
- Integration with other Google Workspace services

## Testing Instructions

### Running Tests
```bash
npm test
npm run test:coverage
```

### Manual Testing
1. Authenticate with Google Calendar
2. Test natural language parsing:
   ```
   gcal-quick-add-event "Lunch with team tomorrow at noon"
   ```
3. Test availability finding:
   ```
   gcal-find-available-time "next week" for 30 minutes
   ```
4. Test permission management:
   ```
   gcal-list-calendar-acl for primary calendar
   ```

## Deployment Notes
- Requires Google Calendar API v3 access
- OAuth2 credentials must be configured
- Supports both service account and user authentication
- Rate limiting handled by Google API quotas

## Team Collaboration
This implementation supports parallel development:
- Core tools are independent and modular
- Shared utilities (AuthManager, dateParser) are stable
- Clear interfaces between components
- Comprehensive test coverage ensures stability