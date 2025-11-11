/**
 * Free/busy query tool - checks availability across multiple calendars
 */

import { MCPTool } from 'mcp-framework';

import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { parseCalendarIds, parseNaturalDate } from '../utils/dateParser.js';
import { FreeBusyQuerySchema } from './schemas/FreeBusyQuerySchema.js';

const logger = createLogger('freebusy-query');

export default class FreeBusyQueryTool extends MCPTool<typeof FreeBusyQuerySchema> {
  name = 'freebusy-query';
  description = 'Check availability across multiple calendars using free/busy information';
  schema = FreeBusyQuerySchema;


  async execute(input: any) {
    try {
      logger.info('Querying free/busy information', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      const calendarIds = parseCalendarIds(input.calendarIds);
      if (calendarIds.length === 0) {
        throw new Error('No valid calendar IDs provided');
      }

      let timeMin = input.timeMin;
      let timeMax = input.timeMax;

      if (!timeMin.match(/^\d{4}-\d{2}-\d{2}T/)) {
        const parsed = parseNaturalDate(timeMin, undefined, input.timeZone);
        if (parsed?.dateTime) {
          timeMin = parsed.dateTime;
        }
      }

      if (!timeMax.match(/^\d{4}-\d{2}-\d{2}T/)) {
        const parsed = parseNaturalDate(timeMax, undefined, input.timeZone);
        if (parsed?.dateTime) {
          timeMax = parsed.dateTime;
        }
      }

      const items = calendarIds.map((id) => ({ id }));

      const requestBody: any = {
        timeMin,
        timeMax,
        items,
      };

      if (input.timeZone) {
        requestBody.timeZone = input.timeZone;
      }

      if (input.groupExpansionMax) {
        requestBody.groupExpansionMax = input.groupExpansionMax;
      }

      const response = await calendar.freebusy.query({ requestBody });

      logger.info('Successfully retrieved free/busy information', {
        calendarsChecked: calendarIds.length,
        timeRange: { timeMin, timeMax },
      });

      const calendars: any[] = [];

      if (response.data.calendars) {
        for (const [calendarId, calendarData] of Object.entries(response.data.calendars)) {
          calendars.push({
            calendarId,
            busy: (calendarData as any).busy || [],
            errors: (calendarData as any).errors,
          });
        }
      }

      return {
        success: true,
        timeMin: response.data.timeMin,
        timeMax: response.data.timeMax,
        calendars,
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
