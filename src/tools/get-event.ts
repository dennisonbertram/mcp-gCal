/**
 * Get event tool - retrieves details of a specific event
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { GetEventSchema } from './schemas/GetEventSchema.js';

const logger = createLogger('get-event');

export default class GetEventTool extends MCPTool<typeof GetEventSchema> {
  name = 'get-event';
  description = 'Get a specific calendar event';
  schema = GetEventSchema;


  async execute(input: { calendarId: string; eventId: string; timeZone?: string }) {
    try {
      logger.info('Getting event', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const apiParams: any = {
        calendarId: input.calendarId,
        eventId: input.eventId,
      };

      if (input.timeZone) {
        apiParams.timeZone = input.timeZone;
      }

      const response = await calendar.events.get(apiParams);

      logger.info(`Successfully retrieved event: ${response.data.summary} (${response.data.id})`);

      const event = response.data;

      return {
        success: true,
        eventId: event.id,
        summary: event.summary,
        description: event.description || undefined,
        location: event.location || undefined,
        start: event.start,
        end: event.end,
        status: event.status,
        created: event.created,
        updated: event.updated,
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
