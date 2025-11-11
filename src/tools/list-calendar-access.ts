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

      const acls = response.data.items || [];
      let summary = `**Calendar Access Control (Sharing) Permissions**\n\n`;
      summary += `Calendar: ${input.calendarId}\n\n`;

      if (acls.length > 0) {
        summary += `Found ${acls.length} access rules:\n\n`;
        for (const acl of acls) {
          const scopeText =
            acl.scope?.type === 'default'
              ? 'Default (Public)'
              : acl.scope?.type === 'user'
                ? `User: ${acl.scope.value}`
                : acl.scope?.type === 'group'
                  ? `Group: ${acl.scope.value}`
                  : acl.scope?.type === 'domain'
                    ? `Domain: ${acl.scope.value}`
                    : 'Unknown scope';
          summary += `👥 **${scopeText}**\n`;
          summary += `   Role: ${acl.role}\n`;
          summary += `   ID: ${acl.id}\n\n`;
        }
      } else {
        summary += `No sharing permissions found (private calendar).\n`;
      }

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      throw handleCalendarError(error);
    }
  }
}
