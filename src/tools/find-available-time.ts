/**
 * Find available time tool - smart meeting time finder across calendars
 */

import { MCPTool } from 'mcp-framework';
import { createCalendarAuth } from '../auth/AuthManager.js';
import { handleCalendarError } from '../utils/error-handler.js';
import { createLogger } from '../utils/logger.js';
import { parseCalendarIds, parseNaturalDateRange } from '../utils/dateParser.js';
import { FindAvailableTimeSchema } from './schemas/FindAvailableTimeSchema.js';

const logger = createLogger('find-available-time');

export default class FindAvailableTimeTool extends MCPTool<typeof FindAvailableTimeSchema> {
  name = 'find-available-time';
  description = 'Smart meeting time finder that suggests available slots across multiple calendars';
  schema = FindAvailableTimeSchema;

  async execute(input: any) {
    try {
      logger.info('Finding available time slots', input);

      const authManager = createCalendarAuth();
      const calendar = await authManager.getCalendarClient();

      // Parse parameters
      const calendarIds = parseCalendarIds(input.calendarIds);
      const durationMs = input.duration * 60 * 1000;
      const maxSuggestions = input.maxSuggestions || 5;

      // Parse search range
      const { start: rangeStart, end: rangeEnd } = parseNaturalDateRange(
        input.searchRange,
        input.timeZone
      );

      if (!rangeStart?.dateTime || !rangeEnd?.dateTime) {
        throw new Error('Could not parse search range');
      }

      // Query free/busy information
      const freeBusyResponse = await calendar.freebusy.query({
        requestBody: {
          timeMin: rangeStart.dateTime,
          timeMax: rangeEnd.dateTime,
          timeZone: input.timeZone,
          items: calendarIds.map((id) => ({ id })),
        },
      });

      // Collect all busy times across calendars
      const busyTimes: Array<{ start: Date; end: Date }> = [];

      if (freeBusyResponse.data.calendars) {
        for (const calendarData of Object.values(freeBusyResponse.data.calendars)) {
          if (calendarData.busy) {
            for (const busy of calendarData.busy) {
              if (busy.start && busy.end) {
                busyTimes.push({
                  start: new Date(busy.start),
                  end: new Date(busy.end),
                });
              }
            }
          }
        }
      }

      // Sort busy times by start time
      busyTimes.sort((a, b) => a.start.getTime() - b.start.getTime());

      // Find available slots
      const availableSlots: Array<{ start: string; end: string; duration: number }> = [];
      const searchStart = new Date(rangeStart.dateTime);
      const searchEnd = new Date(rangeEnd.dateTime);

      // Apply working hours if specified
      const workingHours = input.workingHours || { start: '00:00', end: '23:59' };
      const [workStartHour, workStartMin] = workingHours.start.split(':').map(Number);
      const [workEndHour, workEndMin] = workingHours.end.split(':').map(Number);

      // Check slots between busy times
      let currentTime = new Date(searchStart);

      for (let dayOffset = 0; dayOffset < 30 && availableSlots.length < maxSuggestions; dayOffset++) {
        const dayStart = new Date(searchStart);
        dayStart.setDate(dayStart.getDate() + dayOffset);
        dayStart.setHours(workStartHour, workStartMin, 0, 0);

        const dayEnd = new Date(searchStart);
        dayEnd.setDate(dayEnd.getDate() + dayOffset);
        dayEnd.setHours(workEndHour, workEndMin, 0, 0);

        // Skip if outside search range
        if (dayStart > searchEnd) break;

        currentTime = new Date(Math.max(dayStart.getTime(), searchStart.getTime()));
        const effectiveDayEnd = new Date(Math.min(dayEnd.getTime(), searchEnd.getTime()));

        while (currentTime < effectiveDayEnd && availableSlots.length < maxSuggestions) {
          const slotEnd = new Date(currentTime.getTime() + durationMs);

          // Check if this slot conflicts with any busy time
          let hasConflict = false;
          for (const busy of busyTimes) {
            if (
              (currentTime >= busy.start && currentTime < busy.end) ||
              (slotEnd > busy.start && slotEnd <= busy.end) ||
              (currentTime <= busy.start && slotEnd >= busy.end)
            ) {
              hasConflict = true;
              // Move current time to end of busy period
              currentTime = new Date(busy.end);
              break;
            }
          }

          if (!hasConflict && slotEnd <= effectiveDayEnd) {
            availableSlots.push({
              start: currentTime.toISOString(),
              end: slotEnd.toISOString(),
              duration: input.duration,
            });

            // Move to next potential slot (with 15-minute increments)
            currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
          } else if (!hasConflict) {
            // Slot extends beyond working hours
            break;
          }
        }
      }

      logger.info(`Found ${availableSlots.length} available time slots`);

      return {
        success: true,
        availableSlots: availableSlots.slice(0, maxSuggestions),
        duration: input.duration,
        searchRange: input.searchRange,
        calendarsChecked: calendarIds.length,
        busyPeriodsFound: busyTimes.length,
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
