/**
 * List calendar access tool - lists who has access to a calendar
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { ListCalendarAccessSchema } from './schemas/ListCalendarAccessSchema.js';

const logger = createLogger('list-calendar-access');

export default class ListCalendarAccessTool extends MCPTool<typeof ListCalendarAccessSchema> {
  name = 'list-calendar-access';
  description = 'List all people and groups who have access to a calendar, showing their permission levels (owner, writer, reader)';
  schema = ListCalendarAccessSchema;


  async execute(input: { calendarId: string; showDeleted?: boolean; maxResults?: number }) {
    try {
      logger.info('Listing calendar ACL', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const apiParams: any = {
        calendarId: input.calendarId,
      };

      if (input.showDeleted) {
        apiParams.showDeleted = input.showDeleted;
      }

      if (input.maxResults) {
        apiParams.maxResults = input.maxResults;
      }

      const response = await calendar.acl.list(apiParams);

      logger.info(
        `Successfully retrieved ${response.data.items?.length || 0} ACL rules for calendar ${input.calendarId}`
      );

      const acls = (response.data.items || []).map((acl) => ({
        ruleId: acl.id,
        role: acl.role,
        scopeType: acl.scope?.type,
        scopeValue: acl.scope?.value,
      }));

      return {
        success: true,
        calendarId: input.calendarId,
        accessRules: acls,
        count: acls.length,
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
