/**
 * Create event tool - creates a new calendar event with smart date parsing
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { CreateEventSchema } from './schemas/CreateEventSchema.js';

const logger = createLogger('create-event');

export default class CreateEventTool extends MCPTool<typeof CreateEventSchema> {
  name = 'create-event';
  description = 'Create a new calendar event';
  schema = CreateEventSchema;


  async execute(input: any) {
    try {
      logger.info('Creating event', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const eventData: any = {
        start: input.start,
        end: input.end,
      };

      if (input.summary) {
        eventData.summary = input.summary;
      }

      if (input.description) {
        eventData.description = input.description;
      }

      if (input.location) {
        eventData.location = input.location;
      }

      if (input.attendees) {
        eventData.attendees = input.attendees;
      }

      const apiParams: any = {
        calendarId: input.calendarId,
        requestBody: eventData,
      };

      if (input.sendUpdates) {
        apiParams.sendUpdates = input.sendUpdates;
      }

      const response = await calendar.events.insert(apiParams);

      const event = response.data;

      logger.info(`Successfully created event: ${event.summary} (${event.id})`);

      return {
        success: true,
        eventId: event.id,
        summary: event.summary,
        description: event.description || undefined,
        location: event.location || undefined,
        start: event.start,
        end: event.end,
        status: event.status,
        calendarId: input.calendarId,
      };
    } catch (error) {
      const calendarError = handleCalendarError(error);
      return {
        success: false,
        error: calendarError.message,
        errorType: calendarError.name,
        errorCode: calendarError.code,
      };
    }
  }
}
