/**
 * Quick add event tool - creates events using natural language
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { extractTimezone } from '../utils/dateParser.js';
import { QuickAddEventSchema } from './schemas/QuickAddEventSchema.js';

const logger = createLogger('quick-add-event');

export default class QuickAddEventTool extends MCPTool<typeof QuickAddEventSchema> {
  name = 'quick-add-event';
  description = 'Create an event using natural language (e.g., "Meeting with John tomorrow at 2pm")';
  schema = QuickAddEventSchema;


  async execute(input: { calendarId: string; text: string; sendUpdates?: string }) {
    try {
      logger.info('Quick adding event', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const timezone = extractTimezone(input.text);

      const apiParams: any = {
        calendarId: input.calendarId,
        text: input.text,
      };

      if (input.sendUpdates) {
        apiParams.sendUpdates = input.sendUpdates;
      }

      const response = await calendar.events.quickAdd(apiParams);

      logger.info(`Successfully created event via quickAdd: ${response.data.summary} (${response.data.id})`);

      const event = response.data;

      return {
        success: true,
        eventId: event.id,
        summary: event.summary,
        description: event.description || undefined,
        location: event.location || undefined,
        start: event.start,
        end: event.end,
        calendarId: input.calendarId,
        originalText: input.text,
        detectedTimeZone: timezone || undefined,
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
