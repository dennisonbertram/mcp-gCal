# MCP Framework Tool Return Format - Critical Learning

**Date:** 2025-11-11
**Component:** mcp-framework v0.2.15
**Issue:** Zod validation errors when tools return MCP content format
**Status:** RESOLVED

## Problem Encountered

When using `mcp-framework` v0.2.15 with tools that return MCP content format, Claude Code throws Zod validation errors:

```
Error: [
  {
    "code": "invalid_union",
    "unionErrors": [
      {
        "issues": [
          {
            "received": "error",
            "code": "invalid_literal",
            "expected": "text",
            ...
```

This error occurs even though the MCP SDK documentation suggests returning:
```typescript
return {
  content: [{ type: 'text', text: summary }]
};
```

## Root Cause

**mcp-framework v0.2.15 appears to have issues wrapping or transforming the MCP content format correctly**, leading to Zod validation failures in the MCP SDK when tools return this format.

The framework may be:
1. Double-wrapping the content
2. Incorrectly transforming the response structure
3. Not properly handling the content array format

## Solution: Return Plain Objects

**The correct pattern for mcp-framework v0.2.15 is to return plain JavaScript objects**, similar to what mcp-gmail does.

### ❌ WRONG Pattern (Causes Zod Errors)

```typescript
export default class MyTool extends MCPTool<typeof MySchema> {
  name = 'my-tool';
  description = 'My tool description';
  schema = MySchema;

  async execute(input: MyInput) {
    try {
      // ... do work ...

      const summary = `Operation completed successfully`;

      // ❌ THIS CAUSES ZOD VALIDATION ERRORS
      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      // ❌ THROWING ERRORS ALSO CAUSES ISSUES
      throw handleMyError(error);
    }
  }
}
```

### ✅ CORRECT Pattern (Works with mcp-framework v0.2.15)

```typescript
export default class MyTool extends MCPTool<typeof MySchema> {
  name = 'my-tool';
  description = 'My tool description';
  schema = MySchema;

  async execute(input: MyInput) {
    try {
      // ... do work ...

      // ✅ RETURN PLAIN STRUCTURED OBJECT
      return {
        success: true,
        // Include relevant structured data fields
        resultId: '123',
        summary: 'Operation completed',
        // ... any other relevant fields
      };
    } catch (error) {
      // ✅ CATCH AND RETURN ERROR AS OBJECT
      const myError = handleMyError(error);
      return {
        success: false,
        error: myError.message,
        errorType: myError.name,
        errorCode: myError.code,
      };
    }
  }
}
```

## Key Principles

### 1. Return Plain Objects

Always return plain JavaScript objects with structured data:

```typescript
// ✅ Good
return {
  success: true,
  count: items.length,
  items: itemsSummary,
  metadata: { ... }
};

// ❌ Bad
return {
  content: [{ type: 'text', text: itemsSummary }]
};
```

### 2. Catch Errors, Don't Throw

Always catch errors and return them as structured objects:

```typescript
// ✅ Good
} catch (error) {
  const myError = handleMyError(error);
  return {
    success: false,
    error: myError.message,
    errorType: myError.name,
    errorCode: myError.code,
  };
}

// ❌ Bad
} catch (error) {
  throw handleMyError(error);
}
```

### 3. Include success Field

Always include a `success` boolean field to indicate status:

```typescript
// Success case
return { success: true, /* ... */ };

// Error case
return { success: false, error: '...', /* ... */ };
```

### 4. Structure Your Data

Instead of returning formatted text strings, return structured data:

```typescript
// ✅ Good - Structured data
return {
  success: true,
  calendars: [
    { id: 'cal1', name: 'Work', color: '#1234' },
    { id: 'cal2', name: 'Personal', color: '#5678' }
  ],
  count: 2
};

// ❌ Bad - Formatted text
return {
  content: [{
    type: 'text',
    text: '📅 Work (cal1)\n📅 Personal (cal2)\nFound 2 calendars'
  }]
};
```

## Real-World Example: list-events Tool

### Before (Causing Zod Errors)

```typescript
async execute(input: { calendarId: string; /* ... */ }) {
  try {
    const response = await calendar.events.list(apiParams);
    const events = response.data.items || [];

    const eventList = events
      .map((event) => {
        const startTime = event.start?.dateTime || event.start?.date;
        return `🗺 **${event.summary}**\n   Time: ${startTime}\n`;
      })
      .join('\n');

    const summary = `Found ${events.length} events:\n\n${eventList}`;

    // ❌ THIS CAUSED ZOD ERRORS
    return {
      content: [{ type: 'text', text: summary }],
    };
  } catch (error) {
    throw handleCalendarError(error);
  }
}
```

### After (Working)

```typescript
async execute(input: { calendarId: string; /* ... */ }) {
  try {
    const response = await calendar.events.list(apiParams);
    const events = response.data.items || [];

    const eventList = events
      .map((event) => {
        const startTime = event.start?.dateTime || event.start?.date;
        return `🗺 **${event.summary}**\n   Time: ${startTime}\n`;
      })
      .join('\n');

    const summary = `Found ${events.length} events:\n\n${eventList}`;

    // ✅ RETURN PLAIN OBJECT
    return {
      success: true,
      count: events.length,
      events: summary,
    };
  } catch (error) {
    // ✅ CATCH AND RETURN ERROR
    const calendarError = handleCalendarError(error);
    return {
      success: false,
      error: calendarError.message,
      errorType: calendarError.name,
      errorCode: calendarError.code,
    };
  }
}
```

## How to Apply to Other MCP Servers

### Step 1: Find All Tool Files

```bash
find src/tools -name "*.ts" -type f
```

### Step 2: Search for MCP Content Returns

```bash
grep -r "content:.*type.*text" src/tools/
```

### Step 3: Search for Thrown Errors

```bash
grep -r "throw.*Error" src/tools/
```

### Step 4: Update Each Tool

For each tool found:

1. **Change the return statement:**
   ```typescript
   // From:
   return { content: [{ type: 'text', text: summary }] };

   // To:
   return { success: true, ...relevantFields };
   ```

2. **Change error handling:**
   ```typescript
   // From:
   } catch (error) {
     throw handleError(error);
   }

   // To:
   } catch (error) {
     const myError = handleError(error);
     return {
       success: false,
       error: myError.message,
       errorType: myError.name,
       errorCode: myError.code,
     };
   }
   ```

3. **Include structured data fields:**
   - For list operations: include `count`, array of items
   - For get operations: include the resource fields
   - For create operations: include `id` and created resource fields
   - For delete operations: include `deleted: true` and resource id
   - For update operations: include updated resource fields

### Step 5: Rebuild and Test

```bash
npm run build
npm test
```

## Verification Checklist

After updating all tools, verify:

- [ ] No tools return `{ content: [{ type: 'text', ... }] }`
- [ ] No tools use `throw` in catch blocks
- [ ] All success returns include `success: true`
- [ ] All error returns include `success: false`
- [ ] All error returns include `error`, `errorType`, `errorCode`
- [ ] All returns include structured data fields (not just text)
- [ ] Build succeeds without errors
- [ ] Tools work in Claude Code without Zod validation errors

## Framework Version Notes

This pattern is confirmed working with:
- **mcp-framework:** v0.2.15
- **@modelcontextprotocol/sdk:** v1.21.1

Other framework versions may behave differently. If you upgrade mcp-framework, test thoroughly to see if this pattern is still required.

## References

- **mcp-gmail implementation:** Uses this plain object pattern throughout
- **gcalendar-mcp fix:** Commits 83d75d6, e1c9bf2, d348897
- **Related issue:** Zod validation errors with MCP content format

## Additional Notes

### Why This Works

The mcp-framework likely handles the transformation of plain objects to MCP protocol format internally. By returning plain objects, you let the framework do its job without interfering.

### Framework Responsibility

The framework should be responsible for:
1. Converting plain object returns to MCP protocol format
2. Handling error serialization
3. Managing content types and structure

Your tool's responsibility is simply to:
1. Do the work
2. Return structured data
3. Catch errors and return them as data

### Future Considerations

If mcp-framework is updated to properly handle MCP content format, this pattern may become optional. However, returning plain objects is a simpler, cleaner pattern that's easier to test and maintain, so it may be preferred regardless.

---

**Last Updated:** 2025-11-11
**Applies To:** All MCP servers using mcp-framework v0.2.15
