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

      return {
        success: true,
        ruleId: rule.id,
        role: rule.role,
        scopeType: rule.scope?.type,
        scopeValue: rule.scope?.value,
        calendarId: input.calendarId,
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
