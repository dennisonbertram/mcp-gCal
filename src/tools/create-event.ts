/**
 * Create event tool - creates a new calendar event with smart date parsing
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { CreateEventSchema } from './schemas/CreateEventSchema.js';

const logger = createLogger('create-event');

export default class CreateEventTool extends MCPTool<typeof CreateEventSchema> {
  name = 'create-event';
  description = 'Create a new calendar event';
  schema = CreateEventSchema;


  async execute(input: any) {
    try {
      logger.info('Creating event', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const eventData: any = {
        start: input.start,
        end: input.end,
      };

      if (input.summary) {
        eventData.summary = input.summary;
      }

      if (input.description) {
        eventData.description = input.description;
      }

      if (input.location) {
        eventData.location = input.location;
      }

      if (input.attendees) {
        eventData.attendees = input.attendees;
      }

      const apiParams: any = {
        calendarId: input.calendarId,
        requestBody: eventData,
      };

      if (input.sendUpdates) {
        apiParams.sendUpdates = input.sendUpdates;
      }

      const response = await calendar.events.insert(apiParams);

      logger.info(`Successfully created event: ${response.data.summary} (${response.data.id})`);

      const event = response.data;
      const startTime = event.start?.dateTime || event.start?.date || 'No start time';
      const endTime = event.end?.dateTime || event.end?.date || 'No end time';
      const summary =
        `✅ **Event Created Successfully!**\n\n` +
        `**${event.summary || 'Untitled Event'}**\n` +
        `- ID: ${event.id}\n` +
        `- Time: ${startTime} - ${endTime}\n` +
        (event.location ? `- Location: ${event.location}\n` : '') +
        (event.description ? `- Description: ${event.description}\n` : '') +
        `- Status: ${event.status || 'confirmed'}\n` +
        `- Calendar: ${input.calendarId}\n`;

      return {
        content: [{ type: 'text', text: summary }],
      };
    } catch (error) {
      throw handleCalendarError(error);
    }
  }
}
