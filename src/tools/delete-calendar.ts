/**
 * Delete calendar tool - deletes a calendar
 */

import { MCPTool } from 'mcp-framework';
import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { DeleteCalendarSchema } from './schemas/DeleteCalendarSchema.js';

const logger = createLogger('delete-calendar');

export default class DeleteCalendarTool extends MCPTool<typeof DeleteCalendarSchema> {
  name = 'delete-calendar';
  description = 'Delete a calendar';
  schema = DeleteCalendarSchema;

  async execute(input: { calendarId: string }) {
    try {
      logger.info('Deleting calendar', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      await calendar.calendars.delete({
        calendarId: input.calendarId,
      });

      logger.info(`Successfully deleted calendar: ${input.calendarId}`);

      const summary =
        `✅ **Calendar Deleted Successfully!**\n\n` +
        `Calendar ID: ${input.calendarId}\n` +
        `Deleted: ${new Date().toISOString()}\n`;

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      throw handleCalendarError(error);
    }
  }
}
