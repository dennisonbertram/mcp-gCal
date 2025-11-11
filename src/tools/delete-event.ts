/**
 * Delete event tool - deletes an event from a calendar
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { DeleteEventSchema } from './schemas/DeleteEventSchema.js';

const logger = createLogger('delete-event');

export default class DeleteEventTool extends MCPTool<typeof DeleteEventSchema> {
  name = 'delete-event';
  description = 'Delete a calendar event';
  schema = DeleteEventSchema;


  async execute(input: { calendarId: string; eventId: string; sendUpdates?: string }) {
    try {
      logger.info('Deleting event', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const apiParams: any = {
        calendarId: input.calendarId,
        eventId: input.eventId,
      };

      if (input.sendUpdates) {
        apiParams.sendUpdates = input.sendUpdates;
      }

      await calendar.events.delete(apiParams);

      logger.info(`Successfully deleted event: ${input.eventId} from calendar ${input.calendarId}`);

      return {
        success: true,
        eventId: input.eventId,
        calendarId: input.calendarId,
        deleted: true,
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
