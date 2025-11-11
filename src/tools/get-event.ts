/**
 * Get event tool - retrieves details of a specific event
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { GetEventSchema } from './schemas/GetEventSchema.js';

const logger = createLogger('get-event');

export default class GetEventTool extends MCPTool<typeof GetEventSchema> {
  name = 'get-event';
  description = 'Get a specific calendar event';
  schema = GetEventSchema;


  async execute(input: { calendarId: string; eventId: string; timeZone?: string }) {
    try {
      logger.info('Getting event', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const apiParams: any = {
        calendarId: input.calendarId,
        eventId: input.eventId,
      };

      if (input.timeZone) {
        apiParams.timeZone = input.timeZone;
      }

      const response = await calendar.events.get(apiParams);

      logger.info(`Successfully retrieved event: ${response.data.summary} (${response.data.id})`);

      const event = response.data;
      const startTime = event.start?.dateTime || event.start?.date || 'No start time';
      const endTime = event.end?.dateTime || event.end?.date || 'No end time';
      const summary =
        `🗺 **${event.summary || 'Untitled Event'}**\n\n` +
        `**Event Details:**\n` +
        `- ID: ${event.id}\n` +
        `- Time: ${startTime} - ${endTime}\n` +
        (event.location ? `- Location: ${event.location}\n` : '') +
        (event.description ? `- Description: ${event.description}\n` : '') +
        `- Status: ${event.status || 'confirmed'}\n` +
        `- Created: ${event.created || 'Unknown'}\n` +
        `- Updated: ${event.updated || 'Unknown'}\n`;

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      throw handleCalendarError(error);
    }
  }
}
