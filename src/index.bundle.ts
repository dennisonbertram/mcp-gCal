// src/index.bundle.ts
// Bundle entry point with manual tool registration
// This file is used for creating single-file commercial bundles

import { MCPServer } from "mcp-framework";

// Import all tools
import CreateCalendarTool from "./tools/create-calendar.js";
import CreateEventTool from "./tools/create-event.js";
import DeleteCalendarTool from "./tools/delete-calendar.js";
import DeleteEventTool from "./tools/delete-event.js";
import FindAvailableTimeTool from "./tools/find-available-time.js";
import FreebusyQueryTool from "./tools/freebusy-query.js";
import GetCalendarTool from "./tools/get-calendar.js";
import GetEventTool from "./tools/get-event.js";
import GrantCalendarAccessTool from "./tools/grant-calendar-access.js";
import ListCalendarAccessTool from "./tools/list-calendar-access.js";
import ListCalendarsTool from "./tools/list-calendars.js";
import ListEventsTool from "./tools/list-events.js";
import QuickAddEventTool from "./tools/quick-add-event.js";
import RevokeCalendarAccessTool from "./tools/revoke-calendar-access.js";
import UpdateCalendarAccessTool from "./tools/update-calendar-access.js";
import UpdateCalendarTool from "./tools/update-calendar.js";
import UpdateEventTool from "./tools/update-event.js";

// Create all tool instances
const tools = [
  new CreateCalendarTool(),
  new CreateEventTool(),
  new DeleteCalendarTool(),
  new DeleteEventTool(),
  new FindAvailableTimeTool(),
  new FreebusyQueryTool(),
  new GetCalendarTool(),
  new GetEventTool(),
  new GrantCalendarAccessTool(),
  new ListCalendarAccessTool(),
  new ListCalendarsTool(),
  new ListEventsTool(),
  new QuickAddEventTool(),
  new RevokeCalendarAccessTool(),
  new UpdateCalendarAccessTool(),
  new UpdateCalendarTool(),
  new UpdateEventTool(),
];

// Create MCP server
const server = new MCPServer({
  name: "mcp-gcal",
  version: "0.1.0",
});

// Access private fields to manually register tools
// This is necessary for bundling since mcp-framework uses filesystem-based auto-discovery
const serverAny = server as any;

// Override the loadTools method to return our bundled tools instead of loading from filesystem
serverAny.toolLoader.loadTools = async () => {
  return tools;
};

// Override hasTools to return true since we have bundled tools
serverAny.toolLoader.hasTools = async () => {
  return tools.length > 0;
};

// Start the server (wrap in async IIFE for CommonJS compatibility)
(async () => {
  await server.start();
})().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
