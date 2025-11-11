/**
 * Update calendar access tool - modifies existing access permissions
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { UpdateCalendarAccessSchema } from './schemas/UpdateCalendarAccessSchema.js';

const logger = createLogger('update-calendar-access');

export default class UpdateCalendarAccessTool extends MCPTool<typeof UpdateCalendarAccessSchema> {
  name = 'update-calendar-access';
  description = "Update an existing person's or group's calendar access level, changing their permissions (owner, writer, reader)";
  schema = UpdateCalendarAccessSchema;


  async execute(input: any) {
    try {
      logger.info('Updating calendar ACL rule', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const existingRule = await calendar.acl.get({
        calendarId: input.calendarId,
        ruleId: input.ruleId,
      });

      const updatedRule = {
        ...existingRule.data,
        role: input.role,
      };

      const apiParams: any = {
        calendarId: input.calendarId,
        ruleId: input.ruleId,
        requestBody: updatedRule,
      };

      if (input.sendNotifications !== undefined) {
        apiParams.sendNotifications = input.sendNotifications;
      }

      const response = await calendar.acl.patch(apiParams);

      logger.info(`Successfully updated ACL rule ${input.ruleId} for calendar ${input.calendarId}`, {
        newRole: input.role,
      });

      const rule = response.data;
      const scopeText =
        rule.scope?.type === 'default'
          ? 'Default (Public)'
          : rule.scope?.type === 'user'
            ? `User: ${rule.scope.value}`
            : rule.scope?.type === 'group'
              ? `Group: ${rule.scope.value}`
              : rule.scope?.type === 'domain'
                ? `Domain: ${rule.scope.value}`
                : 'Unknown scope';

      const summary =
        `✅ **Calendar Sharing Permission Updated!**\n\n` +
        `**${scopeText}**\n` +
        `- New Role: ${rule.role}\n` +
        `- Calendar: ${input.calendarId}\n` +
        `- Rule ID: ${rule.id}\n` +
        `- Updated: ${new Date().toISOString()}\n`;

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      throw handleCalendarError(error);
    }
  }
}
