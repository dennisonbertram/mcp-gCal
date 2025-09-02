/**
 * MCP Tool handler and routing system for Google Calendar
 */

import { AuthManager } from '../auth/AuthManager.js';
import { createLogger } from '../utils/logger.js';
import type { CalendarEvent, Calendar } from '../types/calendar.js';

const logger = createLogger('tools');

// Tool handler interface
export interface ToolHandler {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
  handler: (params: any) => Promise<any>;
}

// Tool registry type
export type ToolRegistry = Map<string, ToolHandler>;

/**
 * Register all available calendar tools
 */
export function registerTools(authManager: AuthManager): ToolRegistry {
  const tools = new Map<string, ToolHandler>();

  // List calendars tool
  tools.set('list-calendars', {
    name: 'list-calendars',
    description: 'List all calendars accessible to the user',
    inputSchema: {
      type: 'object',
      properties: {
        showDeleted: {
          type: 'boolean',
          description: 'Whether to include deleted calendar list entries'
        },
        showHidden: {
          type: 'boolean',
          description: 'Whether to show hidden entries'
        }
      }
    },
    handler: async (params) => {
      logger.info('Listing calendars', params);
      const auth = await authManager.authenticate();
      // Placeholder for actual implementation
      return { calendars: [] };
    }
  });

  // List events tool
  tools.set('list-events', {
    name: 'list-events',
    description: 'List events from a calendar',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier (use "primary" for main calendar)'
        },
        timeMin: {
          type: 'string',
          description: 'Lower bound for event start time (RFC3339 timestamp)'
        },
        timeMax: {
          type: 'string',
          description: 'Upper bound for event start time (RFC3339 timestamp)'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of events to return'
        },
        q: {
          type: 'string',
          description: 'Free text search terms'
        },
        showDeleted: {
          type: 'boolean',
          description: 'Whether to include deleted events'
        },
        singleEvents: {
          type: 'boolean',
          description: 'Whether to expand recurring events'
        },
        orderBy: {
          type: 'string',
          enum: ['startTime', 'updated'],
          description: 'Order of the events returned'
        }
      },
      required: ['calendarId']
    },
    handler: async (params) => {
      logger.info('Listing events', params);
      
      if (!params.calendarId) {
        throw new Error('calendarId is required');
      }
      
      const auth = await authManager.authenticate();
      // Placeholder for actual implementation
      return { events: [] };
    }
  });

  // Create event tool
  tools.set('create-event', {
    name: 'create-event',
    description: 'Create a new calendar event',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier'
        },
        summary: {
          type: 'string',
          description: 'Event title'
        },
        description: {
          type: 'string',
          description: 'Event description'
        },
        location: {
          type: 'string',
          description: 'Event location'
        },
        start: {
          type: 'object',
          description: 'Event start time'
        },
        end: {
          type: 'object',
          description: 'Event end time'
        },
        attendees: {
          type: 'array',
          description: 'List of attendees'
        },
        sendUpdates: {
          type: 'string',
          enum: ['all', 'externalOnly', 'none'],
          description: 'Whether to send notifications'
        }
      },
      required: ['calendarId', 'start', 'end']
    },
    handler: async (params) => {
      logger.info('Creating event', params);
      
      if (!params.calendarId || !params.start || !params.end) {
        throw new Error('calendarId, start, and end are required');
      }
      
      const auth = await authManager.authenticate();
      // Placeholder for actual implementation
      return { event: { id: 'placeholder' } };
    }
  });

  // Get event tool
  tools.set('get-event', {
    name: 'get-event',
    description: 'Get a specific calendar event',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier'
        },
        eventId: {
          type: 'string',
          description: 'Event identifier'
        }
      },
      required: ['calendarId', 'eventId']
    },
    handler: async (params) => {
      logger.info('Getting event', params);
      
      if (!params.calendarId || !params.eventId) {
        throw new Error('calendarId and eventId are required');
      }
      
      const auth = await authManager.authenticate();
      // Placeholder for actual implementation
      return { event: { id: params.eventId } };
    }
  });

  // Update event tool
  tools.set('update-event', {
    name: 'update-event',
    description: 'Update an existing calendar event',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier'
        },
        eventId: {
          type: 'string',
          description: 'Event identifier'
        },
        summary: {
          type: 'string',
          description: 'Event title'
        },
        description: {
          type: 'string',
          description: 'Event description'
        },
        location: {
          type: 'string',
          description: 'Event location'
        },
        start: {
          type: 'object',
          description: 'Event start time'
        },
        end: {
          type: 'object',
          description: 'Event end time'
        },
        sendUpdates: {
          type: 'string',
          enum: ['all', 'externalOnly', 'none'],
          description: 'Whether to send notifications'
        }
      },
      required: ['calendarId', 'eventId']
    },
    handler: async (params) => {
      logger.info('Updating event', params);
      
      if (!params.calendarId || !params.eventId) {
        throw new Error('calendarId and eventId are required');
      }
      
      const auth = await authManager.authenticate();
      // Placeholder for actual implementation
      return { event: { id: params.eventId } };
    }
  });

  // Delete event tool
  tools.set('delete-event', {
    name: 'delete-event',
    description: 'Delete a calendar event',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier'
        },
        eventId: {
          type: 'string',
          description: 'Event identifier'
        },
        sendUpdates: {
          type: 'string',
          enum: ['all', 'externalOnly', 'none'],
          description: 'Whether to send cancellation notifications'
        }
      },
      required: ['calendarId', 'eventId']
    },
    handler: async (params) => {
      logger.info('Deleting event', params);
      
      if (!params.calendarId || !params.eventId) {
        throw new Error('calendarId and eventId are required');
      }
      
      const auth = await authManager.authenticate();
      // Placeholder for actual implementation
      return { success: true };
    }
  });

  return tools;
}

/**
 * Get tool definitions for MCP protocol
 */
export function getToolDefinitions(tools: ToolRegistry): any[] {
  const definitions: any[] = [];
  
  for (const [name, tool] of tools.entries()) {
    definitions.push({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    });
  }
  
  return definitions;
}

/**
 * Handle a tool call
 */
export async function handleToolCall(
  tools: ToolRegistry,
  toolName: string,
  params: any
): Promise<any> {
  const tool = tools.get(toolName);
  
  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }
  
  // Validate required parameters
  if (tool.inputSchema.required) {
    for (const required of tool.inputSchema.required) {
      if (!(required in params)) {
        throw new Error(`Missing required parameter: ${required}`);
      }
    }
  }
  
  try {
    const result = await tool.handler(params);
    return {
      toolResult: result
    };
  } catch (error) {
    logger.error(`Error executing tool ${toolName}`, { error });
    throw error;
  }
}