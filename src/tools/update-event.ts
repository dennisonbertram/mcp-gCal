/**
 * Update event tool - updates an existing calendar event
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { UpdateEventSchema } from './schemas/UpdateEventSchema.js';

const logger = createLogger('update-event');

export default class UpdateEventTool extends MCPTool<typeof UpdateEventSchema> {
  name = 'update-event';
  description = 'Update an existing calendar event';
  schema = UpdateEventSchema;


  async execute(input: any) {
    try {
      logger.info('Updating event', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const eventData: any = {};

      if (input.summary !== undefined) {
        eventData.summary = input.summary;
      }

      if (input.description !== undefined) {
        eventData.description = input.description;
      }

      if (input.location !== undefined) {
        eventData.location = input.location;
      }

      if (input.start) {
        eventData.start = input.start;
      }

      if (input.end) {
        eventData.end = input.end;
      }

      const apiParams: any = {
        calendarId: input.calendarId,
        eventId: input.eventId,
        requestBody: eventData,
      };

      if (input.sendUpdates) {
        apiParams.sendUpdates = input.sendUpdates;
      }

      const response = await calendar.events.patch(apiParams);

      logger.info(`Successfully updated event: ${response.data.summary} (${response.data.id})`);

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
