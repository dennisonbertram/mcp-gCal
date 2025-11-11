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
      const summary =
        `📅 **${cal.summary}**\n\n` +
        `**Details:**\n` +
        `- ID: ${cal.id}\n` +
        `- Description: ${cal.description || 'No description'}\n` +
        `- TimeZone: ${cal.timeZone || 'Not specified'}\n` +
        `- Location: ${cal.location || 'Not specified'}\n` +
        `- Created: ${cal.etag ? new Date(parseInt(cal.etag.replace(/"/g, '')) / 1000).toISOString() : 'Unknown'}\n`;

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      throw handleCalendarError(error);
    }
  }
}
