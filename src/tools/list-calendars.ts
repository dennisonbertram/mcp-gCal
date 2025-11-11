/**
 * List calendars tool - retrieves all calendars accessible to the user
 */

import { MCPTool } from 'mcp-framework';
import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { ListCalendarsSchema } from './schemas/ListCalendarsSchema.js';

const logger = createLogger('list-calendars');

export default class ListCalendarsTool extends MCPTool<typeof ListCalendarsSchema> {
  name = 'list-calendars';
  description = 'List all calendars accessible to the user';
  schema = ListCalendarsSchema;

  async execute(input: {
    showDeleted?: boolean;
    showHidden?: boolean;
  }) {
    try {
      logger.info('Listing calendars', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const response = await calendar.calendarList.list({
        showDeleted: input.showDeleted || false,
        showHidden: input.showHidden || false,
        maxResults: 250,
      });

      logger.info(`Successfully retrieved ${response.data.items?.length || 0} calendars`);

      const calendars = (response.data.items || []).map((cal) => ({
        calendarId: cal.id,
        summary: cal.summary,
        description: cal.description || undefined,
        timeZone: cal.timeZone || undefined,
        accessRole: cal.accessRole,
        primary: cal.primary || false,
      }));

      return {
        success: true,
        calendars,
        count: calendars.length,
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
