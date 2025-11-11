/**
 * Grant calendar access tool - shares calendar with user or group
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { GrantCalendarAccessSchema } from './schemas/GrantCalendarAccessSchema.js';

const logger = createLogger('grant-calendar-access');

export default class GrantCalendarAccessTool extends MCPTool<typeof GrantCalendarAccessSchema> {
  name = 'grant-calendar-access';
  description = 'Grant calendar access to a person or group by email address, with specified permission level (owner, writer, reader)';
  schema = GrantCalendarAccessSchema;


  async execute(input: any) {
    try {
      logger.info('Creating calendar ACL rule', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const scope: any = {
        type: input.scopeType,
      };

      if (input.scopeValue) {
        scope.value = input.scopeValue;
      }

      const rule = {
        role: input.role,
        scope,
      };

      const apiParams: any = {
        calendarId: input.calendarId,
        requestBody: rule,
      };

      if (input.sendNotifications !== undefined) {
        apiParams.sendNotifications = input.sendNotifications;
      }

      const response = await calendar.acl.insert(apiParams);

      logger.info(`Successfully created ACL rule for calendar ${input.calendarId}`, {
        role: input.role,
        scope: input.scopeType,
      });

      const scopeText =
        response.data.scope?.type === 'default'
          ? 'Default (Public)'
          : response.data.scope?.type === 'user'
            ? `User: ${response.data.scope.value}`
            : response.data.scope?.type === 'group'
              ? `Group: ${response.data.scope.value}`
              : response.data.scope?.type === 'domain'
                ? `Domain: ${response.data.scope.value}`
                : 'Unknown scope';

      const summary =
        `✅ **Calendar Sharing Permission Created!**\n\n` +
        `**${scopeText}**\n` +
        `- Role: ${response.data.role}\n` +
        `- Calendar: ${input.calendarId}\n` +
        `- Rule ID: ${response.data.id}\n` +
        `- Created: ${new Date().toISOString()}\n`;

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      throw handleCalendarError(error);
    }
  }
}
