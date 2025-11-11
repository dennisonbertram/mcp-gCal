/**
 * Get calendar tool - retrieves details of a specific calendar
 */

import { MCPTool } from 'mcp-framework';
import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { GetCalendarSchema } from './schemas/GetCalendarSchema.js';

const logger = createLogger('get-calendar');

export default class GetCalendarTool extends MCPTool<typeof GetCalendarSchema> {
  name = 'get-calendar';
  description = 'Get details of a specific calendar';
  schema = GetCalendarSchema;

  async execute(input: { calendarId: string }) {
    try {
      logger.info('Getting calendar details', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const response = await calendar.calendars.get({
        calendarId: input.calendarId,
      });

      logger.info(`Successfully retrieved calendar: ${response.data.summary}`);

      const cal = response.data;

      return {
        success: true,
        calendarId: cal.id,
        summary: cal.summary,
        description: cal.description || undefined,
        timeZone: cal.timeZone || undefined,
        location: cal.location || undefined,
        etag: cal.etag || undefined,
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
