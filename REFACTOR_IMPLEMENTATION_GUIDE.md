# MCP-gCal Refactor Implementation Guide

## Overview

This document provides a complete guide to refactoring mcp-gCal from a monolithic architecture to an mcp-framework-based architecture, following the patterns established in mcp-gmail.

## Current Status

### ✅ Completed

1. **Dependencies Upgraded:**
   - @modelcontextprotocol/sdk: 1.0.0 → 1.20.2
   - googleapis: 144.0.0 → 164.1.0
   - Added: mcp-framework (0.2.15)
   - Added: zod (^3.22.0)

2. **TypeScript Configuration Updated:**
   - Added strict type checking options
   - noUncheckedIndexedAccess: true
   - exactOptionalPropertyTypes: true
   - noUnusedLocals: true
   - noUnusedParameters: true
   - noImplicitReturns: true
   - noFallthroughCasesInSwitch: true

3. **Build Scripts Updated:**
   - build: "tsc && mcp-build"
   - test: "vitest && mcp validate"
   - validate: "mcp validate"
   - prepack: "npm run build && mcp validate"

4. **Infrastructure Created:**
   - ✅ `src/utils/error-handler.ts` - Centralized error handling
   - ✅ `src/utils/validators.ts` - Domain validation utilities
   - ✅ `src/tools/schemas/common.ts` - Shared Zod schemas
   - ✅ Example schemas created (ListCalendarsSchema, CreateEventSchema)

5. **Testing Framework:**
   - ✅ Manual testing guide created
   - ✅ Testing procedures documented

## Remaining Work

### Phase 1: Complete All Zod Schemas

Create schema files for each tool in `src/tools/schemas/`:

#### Basic Calendar Schemas
1. **GetCalendarSchema.ts**
```typescript
import { z } from 'zod';
import { CalendarIdSchema } from './common.js';

export const GetCalendarSchema = z.object({
  calendarId: CalendarIdSchema,
});
```

2. **CreateCalendarSchema.ts**
```typescript
import { z } from 'zod';
import { TimeZoneSchema } from './common.js';

export const CreateCalendarSchema = z.object({
  summary: z.string().min(1).describe('Calendar title/name'),
  description: z.string().optional().describe('Calendar description'),
  timeZone: TimeZoneSchema,
});
```

3. **UpdateCalendarSchema.ts**
4. **DeleteCalendarSchema.ts**

#### Event Schemas
5. **ListEventsSchema.ts**
```typescript
import { z } from 'zod';
import { CalendarIdSchema, DateTimeSchema, OrderBySchema } from './common.js';

export const ListEventsSchema = z.object({
  calendarId: CalendarIdSchema,
  timeMin: DateTimeSchema.optional(),
  timeMax: DateTimeSchema.optional(),
  maxResults: z.number().min(1).max(2500).optional(),
  q: z.string().optional().describe('Free text search terms'),
  showDeleted: z.boolean().optional(),
  singleEvents: z.boolean().optional(),
  orderBy: OrderBySchema,
});
```

6. **GetEventSchema.ts**
7. **UpdateEventSchema.ts**
8. **DeleteEventSchema.ts**

#### Advanced Tool Schemas
9. **FreeBusyQuerySchema.ts**
10. **FindAvailableTimeSchema.ts**
11. **QuickAddEventSchema.ts**
12. **ListCalendarAclSchema.ts**
13. **CreateCalendarAclSchema.ts**
14. **UpdateCalendarAclSchema.ts**
15. **DeleteCalendarAclSchema.ts**

### Phase 2: Create Individual Tool Files

Each tool should follow this pattern in `src/tools/`:

**Template: `src/tools/list-calendars.ts`**
```typescript
/**
 * List calendars tool
 */

import { MCPTool } from 'mcp-framework';
import { google } from 'googleapis';
import { ListCalendarsSchema } from './schemas/ListCalendarsSchema.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { AuthManager } from '../auth/AuthManager.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('list-calendars');

export default class ListCalendarsTool extends MCPTool {
  name = 'list-calendars';
  description = 'List all calendars accessible to the user';
  schema = ListCalendarsSchema;

  constructor(private authManager: AuthManager) {
    super();
  }

  async execute(input: any) {
    logger.info('Listing calendars', input);

    try {
      const auth = await this.authManager.authenticate();
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.calendarList.list({
        showDeleted: input.showDeleted || false,
        showHidden: input.showHidden || false,
        maxResults: 250,
      });

      logger.info(`Successfully retrieved ${response.data.items?.length || 0} calendars`);

      const calendars = response.data.items || [];
      const summary =
        `Found ${calendars.length} calendars:\n\n` +
        calendars
          .map(
            (cal) =>
              `📅 **${cal.summary}**\n` +
              `   ID: ${cal.id}\n` +
              `   Access: ${cal.accessRole}\n` +
              `   TimeZone: ${cal.timeZone || 'Not specified'}\n` +
              (cal.description ? `   Description: ${cal.description}\n` : '') +
              `   Primary: ${cal.primary ? 'Yes' : 'No'}\n`
          )
          .join('\n');

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error: unknown) {
      const calendarError = handleCalendarError(error, {
        operation: 'list calendars',
      });
      logger.error('Failed to list calendars', { error: calendarError.message });
      throw calendarError;
    }
  }
}
```

**Tools to Create:**
1. list-calendars.ts (example above)
2. get-calendar.ts
3. create-calendar.ts
4. update-calendar.ts
5. delete-calendar.ts
6. list-events.ts
7. create-event.ts
8. get-event.ts
9. update-event.ts
10. delete-event.ts
11. freebusy-query.ts
12. find-available-time.ts
13. quick-add-event.ts
14. list-calendar-acl.ts
15. create-calendar-acl.ts
16. update-calendar-acl.ts
17. delete-calendar-acl.ts

### Phase 3: Refactor AuthManager

Simplify `src/auth/AuthManager.ts`:

**Key Changes:**
1. Remove unused auth methods (service_account, api_key)
2. Remove encryption complexity
3. Implement random port selection (50000-60000)
4. Add 5-minute OAuth timeout
5. Standardize token path to `~/.config/mcp-gcal/token.json`
6. Add environment variable fallback:
   - Check `GCAL_CLIENT_ID` and `GCAL_CLIENT_SECRET`
   - Then `~/.config/mcp-gcal/credentials.json`
   - Then `./credentials.json`

**Reference Implementation Pattern:**
```typescript
private async startOAuthServer(): Promise<void> {
  // Random port between 50000-60000
  const port = 50000 + Math.floor(Math.random() * 10000);
  this.redirectUri = `http://localhost:${port}/oauth2callback`;

  // 5-minute timeout
  const timeout = setTimeout(() => {
    this.server?.close();
    throw new Error('OAuth authentication timed out after 5 minutes');
  }, 5 * 60 * 1000);

  // ...rest of OAuth flow
}
```

### Phase 4: Refactor Server Entry Point

**New `src/index.ts`:**
```typescript
#!/usr/bin/env node

import { MCPServer } from 'mcp-framework';
import { AuthManager } from './auth/AuthManager.js';
import { getConfig } from './config.js';

async function main() {
  const config = await getConfig();
  const authManager = new AuthManager(config, 'default');

  const server = new MCPServer({
    name: 'mcp-gcal',
    version: '1.0.0',
    basePath: __dirname,
    context: { authManager }, // Pass to all tools
  });

  await server.start();
}

main().catch(console.error);
```

**How mcp-framework auto-discovers tools:**
- It scans the `src/tools/` directory
- Finds all `.ts` files (excluding `index.ts`)
- Imports default exports that extend `MCPTool`
- Automatically registers them

**Update `src/server.ts`:**
- Remove manual tool registration
- Keep resource registrations if any
- Simplify to just return the server instance

### Phase 5: Update Tests

**Update `src/tools/__tests__/advancedTools.test.ts`:**
- Import individual tool files instead of monolithic index
- Update to use new error types
- Test against new schemas

**Create `src/utils/__tests__/error-handler.test.ts`:**
```typescript
import { describe, it, expect } from 'vitest';
import {
  handleCalendarError,
  CalendarAuthError,
  CalendarPermissionError,
  CalendarNotFoundError,
} from '../error-handler.js';

describe('error-handler', () => {
  it('handles 401 errors', () => {
    const error = { code: 401, message: 'Unauthorized' };
    const result = handleCalendarError(error);
    expect(result).toBeInstanceOf(CalendarAuthError);
    expect(result.code).toBe(401);
  });

  // ... more tests
});
```

**Create `src/utils/__tests__/validators.test.ts`:**
```typescript
import { describe, it, expect } from 'vitest';
import { isValidCalendarId, isValidTimeZone, isValidEmail } from '../validators.js';

describe('validators', () => {
  it('validates calendar IDs', () => {
    expect(isValidCalendarId('primary')).toBe(true);
    expect(isValidCalendarId('user@example.com')).toBe(true);
    expect(isValidCalendarId('')).toBe(false);
  });

  // ... more tests
});
```

### Phase 6: Clean Up

1. **Delete obsolete files:**
   ```bash
   rm src/tools/index.ts  # 962-line monolithic file
   ```

2. **Verify no unused imports remain**

3. **Add JSDoc comments to all exported functions**

### Phase 7: Build and Test

1. **Build:**
   ```bash
   npm run build
   ```
   Fix any TypeScript errors from strict mode

2. **Run tests:**
   ```bash
   npm test
   ```
   Fix any failing tests

3. **Validate MCP structure:**
   ```bash
   npm run validate
   ```

4. **Manual testing:**
   - Follow `tests/manual/README.md`
   - Test all 17 tools
   - Verify OAuth flow
   - Compare results to baseline

### Phase 8: Documentation

**Update README.md:**
- Add architecture section
- Explain mcp-framework usage
- Document tool organization
- Update setup instructions

**Add JSDoc comments:**
```typescript
/**
 * List all calendars accessible to the authenticated user
 *
 * @param showDeleted - Include deleted calendar entries
 * @param showHidden - Include hidden calendar entries
 * @returns List of calendars with details
 * @throws {CalendarAuthError} If authentication fails
 * @throws {CalendarPermissionError} If insufficient permissions
 */
```

## File Structure After Completion

```
src/
├── auth/
│   ├── AuthManager.ts (simplified)
│   └── TokenStorage.ts
├── tools/
│   ├── schemas/
│   │   ├── common.ts
│   │   ├── ListCalendarsSchema.ts
│   │   ├── CreateEventSchema.ts
│   │   ├── FreeBusyQuerySchema.ts
│   │   └── ... (17 total schemas)
│   ├── list-calendars.ts
│   ├── get-calendar.ts
│   ├── create-calendar.ts
│   ├── update-calendar.ts
│   ├── delete-calendar.ts
│   ├── list-events.ts
│   ├── create-event.ts
│   ├── get-event.ts
│   ├── update-event.ts
│   ├── delete-event.ts
│   ├── freebusy-query.ts
│   ├── find-available-time.ts
│   ├── quick-add-event.ts
│   ├── list-calendar-acl.ts
│   ├── create-calendar-acl.ts
│   ├── update-calendar-acl.ts
│   └── delete-calendar-acl.ts
├── utils/
│   ├── error-handler.ts ✅
│   ├── validators.ts ✅
│   ├── dateParser.ts (existing)
│   ├── logger.ts (existing)
│   └── __tests__/
│       ├── error-handler.test.ts
│       ├── validators.test.ts
│       └── dateParser.test.ts (existing)
├── types/
│   └── calendar.ts (existing)
├── index.ts (4-10 lines with mcp-framework)
├── server.ts (simplified)
└── auth-cli.ts (existing)
```

## Benefits After Refactor

1. **Better Maintainability:**
   - Each tool in its own file (~50-100 lines each)
   - Easy to find and update specific tools
   - Clear separation of concerns

2. **Type Safety:**
   - Zod schemas provide runtime validation
   - TypeScript types derived from schemas
   - Catches errors before runtime

3. **Error Handling:**
   - Centralized error handling
   - Consistent error messages
   - Proper error types for different scenarios

4. **Testing:**
   - Easier to unit test individual tools
   - Mocked dependencies
   - Better code coverage

5. **Standards Compliance:**
   - Follows mcp-framework conventions
   - Automatic tool discovery
   - Better MCP protocol compliance

## Validation Checklist

Before considering the refactor complete:

- [ ] All 17 tools split into separate files
- [ ] All 17 schemas created with proper validation
- [ ] Error handling centralized (no duplicated try-catch blocks)
- [ ] AuthManager simplified and improved
- [ ] All existing tests pass
- [ ] New tests for error-handler and validators
- [ ] Build completes without errors
- [ ] `mcp validate` passes
- [ ] Manual testing completed (all tools work)
- [ ] OAuth flow tested (fresh auth + token refresh)
- [ ] Documentation updated
- [ ] No breaking changes to API
- [ ] Code follows TypeScript strict mode

## Commit Message Template

```
refactor: Adopt mcp-framework architecture from mcp-gmail

Major architectural refactor to modernize codebase and improve maintainability:

**Architecture Changes:**
- Split 962-line monolithic tool file into 17 separate tool files
- Adopted mcp-framework for automatic tool discovery and registration
- Centralized error handling with typed error classes
- Added Zod schemas for runtime validation and type safety

**Dependencies Updated:**
- @modelcontextprotocol/sdk: 1.0.0 → 1.20.2
- googleapis: 144.0.0 → 164.1.0
- Added mcp-framework (0.2.15)
- Added zod (^3.22.0)

**TypeScript Improvements:**
- Enabled strict type checking options
- noUncheckedIndexedAccess, exactOptionalPropertyTypes
- noUnusedLocals, noImplicitReturns
- Better type safety throughout codebase

**Authentication Improvements:**
- Simplified AuthManager (removed unused auth methods)
- Random port selection (50000-60000) for OAuth
- 5-minute timeout for OAuth flow
- Environment variable fallback support

**Testing:**
- All existing tests pass
- New tests for error handling and validation
- Manual testing guide created
- No breaking changes to API

**Benefits:**
- Better code organization (17 files vs 1 massive file)
- Easier maintenance and debugging
- Consistent error handling
- Runtime type validation
- Follows mcp-framework best practices

Fixes #[issue-number] (if applicable)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Next Steps After Refactor

1. **Performance Testing:**
   - Measure cold start time
   - Check memory usage
   - Test with high request volume

2. **Additional Features:**
   - Add caching for calendar lists
   - Implement request batching
   - Add webhook support

3. **Documentation:**
   - API documentation
   - Architecture decision records
   - Contributing guidelines

4. **CI/CD:**
   - Set up automated testing
   - Add pre-commit hooks
   - Configure deployment pipeline
