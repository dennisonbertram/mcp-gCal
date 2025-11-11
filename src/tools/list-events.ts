/**
 * List events tool - retrieves events from a calendar with flexible filters
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { ListEventsSchema } from './schemas/ListEventsSchema.js';

const logger = createLogger('list-events');

export default class ListEventsTool extends MCPTool<typeof ListEventsSchema> {
  name = 'list-events';
  description = 'List events from a calendar';
  schema = ListEventsSchema;


  async execute(input: {
    calendarId: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    q?: string;
    showDeleted?: boolean;
    singleEvents?: boolean;
    orderBy?: 'startTime' | 'updated';
    timeZone?: string;
  }) {
    try {
      logger.info('Listing events', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const apiParams: any = {
        calendarId: input.calendarId,
        singleEvents: input.singleEvents !== undefined ? input.singleEvents : true,
        orderBy: input.orderBy || 'startTime',
      };

      if (input.timeMin) {
        apiParams.timeMin = input.timeMin;
      }

      if (input.timeMax) {
        apiParams.timeMax = input.timeMax;
      }

      if (input.maxResults) {
        apiParams.maxResults = Math.min(input.maxResults, 2500);
      }

      if (input.q) {
        apiParams.q = input.q;
      }

      if (input.showDeleted) {
        apiParams.showDeleted = input.showDeleted;
      }

      if (input.timeZone) {
        apiParams.timeZone = input.timeZone;
      }

      const response = await calendar.events.list(apiParams);

      logger.info(
        `Successfully retrieved ${response.data.items?.length || 0} events from calendar ${input.calendarId}`
      );

      const events = response.data.items || [];
      const eventList =
        events.length > 0
          ? events
              .map((event) => {
                const startTime = event.start?.dateTime || event.start?.date || 'No start time';
                const endTime = event.end?.dateTime || event.end?.date || 'No end time';
                return (
                  `🗺 **${event.summary || 'Untitled Event'}**\n` +
                  `   Time: ${startTime} - ${endTime}\n` +
                  `   ID: ${event.id}\n` +
                  (event.location ? `   Location: ${event.location}\n` : '') +
                  (event.description ? `   Description: ${event.description}\n` : '') +
                  `   Status: ${event.status || 'confirmed'}\n`
                );
              })
              .join('\n')
          : 'No events found.';

      const summary = `Found ${events.length} events in calendar:\n\n${eventList}`;

      return {
        success: true,
        count: events.length,
        events: summary,
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
