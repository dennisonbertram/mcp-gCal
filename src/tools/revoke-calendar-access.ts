/**
 * Revoke calendar access tool - removes calendar access completely
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { RevokeCalendarAccessSchema } from './schemas/RevokeCalendarAccessSchema.js';

const logger = createLogger('revoke-calendar-access');

export default class RevokeCalendarAccessTool extends MCPTool<typeof RevokeCalendarAccessSchema> {
  name = 'revoke-calendar-access';
  description = 'Revoke calendar access from a person or group, completely removing their ability to view or edit the calendar';
  schema = RevokeCalendarAccessSchema;


  async execute(input: { calendarId: string; ruleId: string; sendNotifications?: boolean }) {
    try {
      logger.info('Deleting calendar ACL rule', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const apiParams: any = {
        calendarId: input.calendarId,
        ruleId: input.ruleId,
      };

      if (input.sendNotifications !== undefined) {
        apiParams.sendNotifications = input.sendNotifications;
      }

      await calendar.acl.delete(apiParams);

      logger.info(`Successfully deleted ACL rule ${input.ruleId} from calendar ${input.calendarId}`);

      const summary =
        `✅ **Calendar Sharing Permission Removed!**\n\n` +
        `Rule ID: ${input.ruleId}\n` +
        `Calendar: ${input.calendarId}\n` +
        `Deleted: ${new Date().toISOString()}\n`;

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      throw handleCalendarError(error);
    }
  }
}
