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

      const calendars = response.data.items || [];
      const summary =
        `Found ${calendars.length} calendars:\n\n` +
        calendars
          .map(
            (cal) =>
              `📅 **${cal.summary}**\n` +
              `   ID: ${cal.id}\n` +
              `   Access: ${cal.accessRole}\n` +
              `   TimeZone: ${cal.timeZone || 'Not specified'}\n` +
              (cal.description ? `   Description: ${cal.description}\n` : '') +
              `   Primary: ${cal.primary ? 'Yes' : 'No'}\n`
          )
          .join('\n');

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      throw handleCalendarError(error);
    }
  }
}
