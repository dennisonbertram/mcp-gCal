/**
 * MCP Tool handler and routing system for Google Calendar
 */

import { google } from 'googleapis';
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
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Make real API call to Google Calendar
        const response = await calendar.calendarList.list({
          showDeleted: params.showDeleted || false,
          showHidden: params.showHidden || false,
          maxResults: 250  // Google Calendar API default
        });
        
        logger.info(`Successfully retrieved ${response.data.items?.length || 0} calendars`);
        
        return {
          kind: response.data.kind,
          etag: response.data.etag,
          nextSyncToken: response.data.nextSyncToken,
          calendars: response.data.items || []
        };
      } catch (error: any) {
        logger.error('Failed to list calendars', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to access calendars');
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to list calendars: ${error.message}`);
        }
      }
    }
  });

  // Get calendar details tool
  tools.set('get-calendar', {
    name: 'get-calendar',
    description: 'Get details of a specific calendar',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier (use "primary" for main calendar)'
        }
      },
      required: ['calendarId']
    },
    handler: async (params) => {
      logger.info('Getting calendar details', params);
      
      if (!params.calendarId) {
        throw new Error('calendarId is required');
      }
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Make real API call to Google Calendar
        const response = await calendar.calendars.get({
          calendarId: params.calendarId
        });
        
        logger.info(`Successfully retrieved calendar: ${response.data.summary}`);
        
        return response.data;
      } catch (error: any) {
        logger.error('Failed to get calendar', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to access calendar');
        } else if (error.code === 404) {
          throw new Error(`Calendar not found: ${params.calendarId}`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to get calendar: ${error.message}`);
        }
      }
    }
  });

  // Create calendar tool
  tools.set('create-calendar', {
    name: 'create-calendar',
    description: 'Create a new calendar',
    inputSchema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Calendar title/name'
        },
        description: {
          type: 'string',
          description: 'Calendar description'
        },
        timeZone: {
          type: 'string',
          description: 'Calendar timezone (e.g., America/New_York)'
        }
      },
      required: ['summary']
    },
    handler: async (params) => {
      logger.info('Creating calendar', params);
      
      if (!params.summary) {
        throw new Error('summary is required');
      }
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Prepare calendar data
        const calendarData: any = {
          summary: params.summary
        };
        
        if (params.description) {
          calendarData.description = params.description;
        }
        
        if (params.timeZone) {
          calendarData.timeZone = params.timeZone;
        }
        
        // Make real API call to Google Calendar
        const response = await calendar.calendars.insert({
          requestBody: calendarData
        });
        
        logger.info(`Successfully created calendar: ${response.data.summary} (${response.data.id})`);
        
        return response.data;
      } catch (error: any) {
        logger.error('Failed to create calendar', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to create calendar');
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to create calendar: ${error.message}`);
        }
      }
    }
  });

  // Update calendar tool
  tools.set('update-calendar', {
    name: 'update-calendar',
    description: 'Update an existing calendar',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier'
        },
        summary: {
          type: 'string',
          description: 'Calendar title/name'
        },
        description: {
          type: 'string',
          description: 'Calendar description'
        },
        timeZone: {
          type: 'string',
          description: 'Calendar timezone (e.g., America/New_York)'
        }
      },
      required: ['calendarId']
    },
    handler: async (params) => {
      logger.info('Updating calendar', params);
      
      if (!params.calendarId) {
        throw new Error('calendarId is required');
      }
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Prepare calendar data (only include fields that are provided)
        const calendarData: any = {};
        
        if (params.summary) {
          calendarData.summary = params.summary;
        }
        
        if (params.description !== undefined) {
          calendarData.description = params.description;
        }
        
        if (params.timeZone) {
          calendarData.timeZone = params.timeZone;
        }
        
        // Make real API call to Google Calendar
        const response = await calendar.calendars.patch({
          calendarId: params.calendarId,
          requestBody: calendarData
        });
        
        logger.info(`Successfully updated calendar: ${response.data.summary} (${response.data.id})`);
        
        return response.data;
      } catch (error: any) {
        logger.error('Failed to update calendar', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to update calendar');
        } else if (error.code === 404) {
          throw new Error(`Calendar not found: ${params.calendarId}`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to update calendar: ${error.message}`);
        }
      }
    }
  });

  // Delete calendar tool
  tools.set('delete-calendar', {
    name: 'delete-calendar',
    description: 'Delete a calendar (cannot delete primary calendar)',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier (cannot be "primary")'
        }
      },
      required: ['calendarId']
    },
    handler: async (params) => {
      logger.info('Deleting calendar', params);
      
      if (!params.calendarId) {
        throw new Error('calendarId is required');
      }
      
      if (params.calendarId === 'primary') {
        throw new Error('Cannot delete primary calendar');
      }
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Make real API call to Google Calendar
        await calendar.calendars.delete({
          calendarId: params.calendarId
        });
        
        logger.info(`Successfully deleted calendar: ${params.calendarId}`);
        
        return { 
          success: true, 
          message: `Calendar ${params.calendarId} deleted successfully` 
        };
      } catch (error: any) {
        logger.error('Failed to delete calendar', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to delete calendar');
        } else if (error.code === 404) {
          throw new Error(`Calendar not found: ${params.calendarId}`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to delete calendar: ${error.message}`);
        }
      }
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
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Prepare API parameters
        const apiParams: any = {
          calendarId: params.calendarId,
          singleEvents: params.singleEvents !== undefined ? params.singleEvents : true,
          orderBy: params.orderBy || 'startTime'
        };
        
        if (params.timeMin) {
          apiParams.timeMin = params.timeMin;
        }
        
        if (params.timeMax) {
          apiParams.timeMax = params.timeMax;
        }
        
        if (params.maxResults) {
          apiParams.maxResults = Math.min(params.maxResults, 2500); // Google Calendar API limit
        }
        
        if (params.q) {
          apiParams.q = params.q;
        }
        
        if (params.showDeleted) {
          apiParams.showDeleted = params.showDeleted;
        }
        
        // Make real API call to Google Calendar
        const response = await calendar.events.list(apiParams);
        
        logger.info(`Successfully retrieved ${response.data.items?.length || 0} events from calendar ${params.calendarId}`);
        
        return {
          kind: response.data.kind,
          etag: response.data.etag,
          summary: response.data.summary,
          description: response.data.description,
          updated: response.data.updated,
          timeZone: response.data.timeZone,
          accessRole: response.data.accessRole,
          defaultReminders: response.data.defaultReminders,
          nextSyncToken: response.data.nextSyncToken,
          nextPageToken: response.data.nextPageToken,
          events: response.data.items || []
        };
      } catch (error: any) {
        logger.error('Failed to list events', { error: error.message, calendarId: params.calendarId });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to access calendar events');
        } else if (error.code === 404) {
          throw new Error(`Calendar not found: ${params.calendarId}`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to list events: ${error.message}`);
        }
      }
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
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Prepare event data
        const eventData: any = {
          start: params.start,
          end: params.end
        };
        
        if (params.summary) {
          eventData.summary = params.summary;
        }
        
        if (params.description) {
          eventData.description = params.description;
        }
        
        if (params.location) {
          eventData.location = params.location;
        }
        
        if (params.attendees) {
          eventData.attendees = params.attendees;
        }
        
        // Prepare API parameters
        const apiParams: any = {
          calendarId: params.calendarId,
          requestBody: eventData
        };
        
        if (params.sendUpdates) {
          apiParams.sendUpdates = params.sendUpdates;
        }
        
        // Make real API call to Google Calendar
        const response = await calendar.events.insert(apiParams);
        
        logger.info(`Successfully created event: ${response.data.summary} (${response.data.id})`);
        
        return response.data;
      } catch (error: any) {
        logger.error('Failed to create event', { error: error.message, calendarId: params.calendarId });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to create events in calendar');
        } else if (error.code === 404) {
          throw new Error(`Calendar not found: ${params.calendarId}`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to create event: ${error.message}`);
        }
      }
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
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Make real API call to Google Calendar
        const response = await calendar.events.get({
          calendarId: params.calendarId,
          eventId: params.eventId
        });
        
        logger.info(`Successfully retrieved event: ${response.data.summary} (${response.data.id})`);
        
        return response.data;
      } catch (error: any) {
        logger.error('Failed to get event', { error: error.message, calendarId: params.calendarId, eventId: params.eventId });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to access event');
        } else if (error.code === 404) {
          throw new Error(`Event not found: ${params.eventId} in calendar ${params.calendarId}`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to get event: ${error.message}`);
        }
      }
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
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Prepare event data (only include fields that are provided)
        const eventData: any = {};
        
        if (params.summary !== undefined) {
          eventData.summary = params.summary;
        }
        
        if (params.description !== undefined) {
          eventData.description = params.description;
        }
        
        if (params.location !== undefined) {
          eventData.location = params.location;
        }
        
        if (params.start) {
          eventData.start = params.start;
        }
        
        if (params.end) {
          eventData.end = params.end;
        }
        
        // Prepare API parameters
        const apiParams: any = {
          calendarId: params.calendarId,
          eventId: params.eventId,
          requestBody: eventData
        };
        
        if (params.sendUpdates) {
          apiParams.sendUpdates = params.sendUpdates;
        }
        
        // Make real API call to Google Calendar
        const response = await calendar.events.patch(apiParams);
        
        logger.info(`Successfully updated event: ${response.data.summary} (${response.data.id})`);
        
        return response.data;
      } catch (error: any) {
        logger.error('Failed to update event', { error: error.message, calendarId: params.calendarId, eventId: params.eventId });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to update event');
        } else if (error.code === 404) {
          throw new Error(`Event not found: ${params.eventId} in calendar ${params.calendarId}`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to update event: ${error.message}`);
        }
      }
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
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Prepare API parameters
        const apiParams: any = {
          calendarId: params.calendarId,
          eventId: params.eventId
        };
        
        if (params.sendUpdates) {
          apiParams.sendUpdates = params.sendUpdates;
        }
        
        // Make real API call to Google Calendar
        await calendar.events.delete(apiParams);
        
        logger.info(`Successfully deleted event: ${params.eventId} from calendar ${params.calendarId}`);
        
        return { 
          success: true, 
          message: `Event ${params.eventId} deleted successfully from calendar ${params.calendarId}` 
        };
      } catch (error: any) {
        logger.error('Failed to delete event', { error: error.message, calendarId: params.calendarId, eventId: params.eventId });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to delete event');
        } else if (error.code === 404) {
          throw new Error(`Event not found: ${params.eventId} in calendar ${params.calendarId}`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to delete event: ${error.message}`);
        }
      }
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