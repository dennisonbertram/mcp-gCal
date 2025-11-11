/**
 * Quick add event tool - creates events using natural language
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { extractTimezone } from '../utils/dateParser.js';
import { QuickAddEventSchema } from './schemas/QuickAddEventSchema.js';

const logger = createLogger('quick-add-event');

export default class QuickAddEventTool extends MCPTool<typeof QuickAddEventSchema> {
  name = 'quick-add-event';
  description = 'Create an event using natural language (e.g., "Meeting with John tomorrow at 2pm")';
  schema = QuickAddEventSchema;


  async execute(input: { calendarId: string; text: string; sendUpdates?: string }) {
    try {
      logger.info('Quick adding event', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const timezone = extractTimezone(input.text);

      const apiParams: any = {
        calendarId: input.calendarId,
        text: input.text,
      };

      if (input.sendUpdates) {
        apiParams.sendUpdates = input.sendUpdates;
      }

      const response = await calendar.events.quickAdd(apiParams);

      logger.info(`Successfully created event via quickAdd: ${response.data.summary} (${response.data.id})`);

      const event = response.data;
      const summary =
        `✅ **Event Created from Natural Language!**\n\n` +
        `**${event.summary || 'Quick Event'}**\n` +
        `- Original text: "${input.text}"\n` +
        `- ID: ${event.id}\n` +
        `- Time: ${event.start?.dateTime || event.start?.date} - ${event.end?.dateTime || event.end?.date}\n` +
        (event.location ? `- Location: ${event.location}\n` : '') +
        (event.description ? `- Description: ${event.description}\n` : '') +
        `- Calendar: ${input.calendarId}\n` +
        (timezone ? `- Detected timezone: ${timezone}\n` : '');

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      throw handleCalendarError(error);
    }
  }
}
