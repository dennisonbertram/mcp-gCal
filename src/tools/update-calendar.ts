/**
 * Update calendar tool - updates an existing calendar's metadata
 */

import { MCPTool } from 'mcp-framework';
import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { UpdateCalendarSchema } from './schemas/UpdateCalendarSchema.js';

const logger = createLogger('update-calendar');

export default class UpdateCalendarTool extends MCPTool<typeof UpdateCalendarSchema> {
  name = 'update-calendar';
  description = 'Update an existing calendar';
  schema = UpdateCalendarSchema;

  async execute(input: {
    calendarId: string;
    summary?: string;
    description?: string;
    timeZone?: string;
    location?: string;
  }) {
    try {
      logger.info('Updating calendar', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const calendarData: any = {};

      if (input.summary !== undefined) {
        calendarData.summary = input.summary;
      }

      if (input.description !== undefined) {
        calendarData.description = input.description;
      }

      if (input.timeZone !== undefined) {
        calendarData.timeZone = input.timeZone;
      }

      if (input.location !== undefined) {
        calendarData.location = input.location;
      }

      const response = await calendar.calendars.patch({
        calendarId: input.calendarId,
        requestBody: calendarData,
      });

      logger.info(`Successfully updated calendar: ${response.data.summary} (${response.data.id})`);

      const cal = response.data;
      const summary =
        `✅ **Calendar Updated Successfully!**\n\n` +
        `**${cal.summary}**\n` +
        `- ID: ${cal.id}\n` +
        `- Description: ${cal.description || 'No description'}\n` +
        `- TimeZone: ${cal.timeZone || 'Not specified'}\n` +
        `- Location: ${cal.location || 'Not specified'}\n` +
        `- Updated: ${new Date().toISOString()}\n`;

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      throw handleCalendarError(error);
    }
  }
}
