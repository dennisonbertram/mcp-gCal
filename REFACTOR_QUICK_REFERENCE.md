# MCP-gCal Refactor Quick Reference

**Status:** Foundation Complete
**Branch:** `refactor/adopt-mcp-framework`
**Last Updated:** 2025-11-10

---

## What's Done ✅

- [x] Dependencies upgraded (SDK 1.0→1.20, googleapis 144→164, +mcp-framework, +zod)
- [x] TypeScript strict mode configured
- [x] Build scripts updated (mcp-build, mcp validate)
- [x] Error handling system created (7 error types, 1 handler function)
- [x] Validation utilities created (12 validator functions)
- [x] Zod schema infrastructure (common schemas + 2 examples)
- [x] Comprehensive documentation (3 guides, 1,000+ lines)
- [x] Testing framework (manual testing guide)

**Files Created:** 8 new files, 3 modified
**Infrastructure Code:** ~700 lines
**Documentation:** ~1,000 lines

---

## What's Next ⏭️

### Immediate Next Steps (Choose One)

**Option A: Continue Implementation**
1. Create remaining 15 Zod schemas (1-2 hrs)
2. Split 17 tools into separate files (2-3 hrs)
3. Refactor AuthManager (1 hr)
4. Update server entry point (30 mins)
5. Test and fix (1-2 hrs)

**Option B: Review and Plan**
1. Read `REFACTOR_IMPLEMENTATION_GUIDE.md`
2. Review created infrastructure files
3. Plan your implementation approach

**Option C: Get Help**
1. Share docs with another developer
2. Use AI assistance for mechanical parts
3. Focus on complex refactoring yourself

---

## Key Files Reference

### Documentation
| File | Purpose | Lines |
|------|---------|-------|
| `REFACTOR_SUMMARY_REPORT.md` | Comprehensive status report | 500+ |
| `REFACTOR_IMPLEMENTATION_GUIDE.md` | Step-by-step how-to guide | 400+ |
| `REFACTOR_STATUS.md` | Progress tracking | 300+ |
| `tests/manual/README.md` | Testing procedures | 200+ |

### Infrastructure
| File | Purpose | Lines |
|------|---------|-------|
| `src/utils/error-handler.ts` | Centralized error handling | 230 |
| `src/utils/validators.ts` | Domain validators | 180 |
| `src/tools/schemas/common.ts` | Shared Zod schemas | 120 |
| `src/tools/schemas/ListCalendarsSchema.ts` | Simple schema example | 15 |
| `src/tools/schemas/CreateEventSchema.ts` | Complex schema example | 25 |

---

## Implementation Patterns

### Pattern 1: Create a Schema
```typescript
// src/tools/schemas/GetCalendarSchema.ts
import { z } from 'zod';
import { CalendarIdSchema } from './common.js';

export const GetCalendarSchema = z.object({
  calendarId: CalendarIdSchema,
});

export type GetCalendarInput = z.infer<typeof GetCalendarSchema>;
```

### Pattern 2: Create a Tool
```typescript
// src/tools/get-calendar.ts
import { MCPTool } from 'mcp-framework';
import { google } from 'googleapis';
import { GetCalendarSchema } from './schemas/GetCalendarSchema.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { AuthManager } from '../auth/AuthManager.js';

export default class GetCalendarTool extends MCPTool {
  name = 'get-calendar';
  description = 'Get details of a specific calendar';
  schema = GetCalendarSchema;

  constructor(private authManager: AuthManager) {
    super();
  }

  async execute(input: any) {
    try {
      const auth = await this.authManager.authenticate();
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.calendars.get({
        calendarId: input.calendarId,
      });

      // Format and return response
      return {
        content: [{ type: 'text', text: `...` }]
      };
    } catch (error: unknown) {
      throw handleCalendarError(error, {
        operation: 'get calendar',
        calendarId: input.calendarId,
        resourceType: 'Calendar',
      });
    }
  }
}
```

---

## Quick Commands

### Development
```bash
# Install dependencies (already done)
npm install

# Build project
npm run build

# Run tests
npm test

# Validate MCP structure
npm run validate

# Format code
npm run format
```

### Git
```bash
# Check status
git status

# See changes
git diff --stat

# When ready to commit
git add .
git commit -m "refactor: Adopt mcp-framework architecture"
git push origin refactor/adopt-mcp-framework
```

---

## Files to Create

### Schemas (15 files)
**Directory:** `src/tools/schemas/`

Basic Calendar:
- [ ] GetCalendarSchema.ts
- [ ] CreateCalendarSchema.ts
- [ ] UpdateCalendarSchema.ts
- [ ] DeleteCalendarSchema.ts

Events:
- [ ] ListEventsSchema.ts
- [ ] GetEventSchema.ts
- [ ] UpdateEventSchema.ts
- [ ] DeleteEventSchema.ts

Advanced:
- [ ] FreeBusyQuerySchema.ts
- [ ] FindAvailableTimeSchema.ts
- [ ] QuickAddEventSchema.ts
- [ ] ListCalendarAclSchema.ts
- [ ] CreateCalendarAclSchema.ts
- [ ] UpdateCalendarAclSchema.ts
- [ ] DeleteCalendarAclSchema.ts

### Tools (17 files)
**Directory:** `src/tools/`

- [ ] list-calendars.ts (template in guide)
- [ ] get-calendar.ts
- [ ] create-calendar.ts
- [ ] update-calendar.ts
- [ ] delete-calendar.ts
- [ ] list-events.ts
- [ ] create-event.ts
- [ ] get-event.ts
- [ ] update-event.ts
- [ ] delete-event.ts
- [ ] freebusy-query.ts
- [ ] find-available-time.ts
- [ ] quick-add-event.ts
- [ ] list-calendar-acl.ts
- [ ] create-calendar-acl.ts
- [ ] update-calendar-acl.ts
- [ ] delete-calendar-acl.ts

---

## Time Estimates

| Phase | Task | Time |
|-------|------|------|
| 1 | Complete Zod schemas | 1-2 hrs |
| 2 | Split tools into files | 2-3 hrs |
| 3 | Refactor AuthManager | 1 hr |
| 4 | Update server entry | 30 mins |
| 5 | Update tests | 1 hr |
| 6 | Build and fix | 1-2 hrs |
| 7 | Documentation | 30 mins |
| 8 | Clean up | 15 mins |
| **Total** | **Full refactor** | **6-9 hrs** |

---

## Success Checklist

- [ ] All 15 schemas created
- [ ] All 17 tools split
- [ ] AuthManager simplified
- [ ] Server using mcp-framework
- [ ] Old files deleted
- [ ] Build succeeds
- [ ] All tests pass
- [ ] mcp validate passes
- [ ] Manual testing done
- [ ] OAuth verified
- [ ] README updated
- [ ] Commit created

---

## Common Pitfalls

1. **Don't commit yet** - Wait until everything is complete
2. **Build often** - After every 3-4 files
3. **Use templates** - Don't deviate from patterns
4. **Test incrementally** - Catch issues early
5. **Follow strict TypeScript** - Fix type errors immediately

---

## Getting Help

1. **Read the guides:** All answers are documented
2. **Check examples:** See created files for patterns
3. **Build incrementally:** Test each change
4. **Ask questions:** Reference this context

---

## Completion

When all boxes are checked:

```bash
# Review changes
git diff --stat

# Stage everything
git add .

# Commit (use message from guide)
git commit -F COMMIT_MESSAGE.txt

# Push
git push origin refactor/adopt-mcp-framework

# Create PR
gh pr create --base main --title "Refactor: Adopt mcp-framework architecture"
```

---

**Quick Links:**
- [📋 Full Implementation Guide](./REFACTOR_IMPLEMENTATION_GUIDE.md)
- [📊 Detailed Status Report](./REFACTOR_SUMMARY_REPORT.md)
- [✅ Progress Tracking](./REFACTOR_STATUS.md)
- [🧪 Testing Guide](./tests/manual/README.md)
