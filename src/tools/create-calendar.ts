/**
 * Create calendar tool - creates a new calendar
 */

import { MCPTool } from 'mcp-framework';
import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { CreateCalendarSchema } from './schemas/CreateCalendarSchema.js';

const logger = createLogger('create-calendar');

export default class CreateCalendarTool extends MCPTool<typeof CreateCalendarSchema> {
  name = 'create-calendar';
  description = 'Create a new calendar';
  schema = CreateCalendarSchema;

  async execute(input: {
    summary: string;
    description?: string;
    timeZone?: string;
    location?: string;
  }) {
    try {
      logger.info('Creating calendar', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const calendarData: any = {
        summary: input.summary,
      };

      if (input.description) {
        calendarData.description = input.description;
      }

      if (input.timeZone) {
        calendarData.timeZone = input.timeZone;
      }

      if (input.location) {
        calendarData.location = input.location;
      }

      const response = await calendar.calendars.insert({
        requestBody: calendarData,
      });

      const cal = response.data;

      logger.info(`Successfully created calendar: ${cal.summary} (${cal.id})`);

      return {
        success: true,
        calendarId: cal.id,
        summary: cal.summary,
        description: cal.description || undefined,
        timeZone: cal.timeZone || undefined,
        location: cal.location || undefined,
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
