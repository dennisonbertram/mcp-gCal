/**
 * Schema for gcal-find-available-time tool
 */

import { z } from 'zod';
import { TimeZoneSchema } from './common.js';

const WorkingHoursSchema = z.object({
  start: z.string().describe('Start time in HH:MM format (e.g., "09:00")'),
  end: z.string().describe('End time in HH:MM format (e.g., "17:00")'),
});

export const FindAvailableTimeSchema = z.object({
  calendarIds: z
    .string()
    .min(1)
    .describe('Comma-separated list of calendar IDs to check for availability'),
  duration: z
    .number()
    .int()
    .min(1)
    .describe('Meeting duration in minutes'),
  searchRange: z
    .string()
    .min(1)
    .describe('Time range to search (e.g., "next week", "tomorrow 9am to 5pm")'),
  timeZone: TimeZoneSchema,
  workingHours: WorkingHoursSchema.optional().describe(
    'Preferred working hours (e.g., { start: "09:00", end: "17:00" })'
  ),
  maxSuggestions: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Maximum number of time slots to suggest (default: 5)'),
});

export type FindAvailableTimeInput = z.infer<typeof FindAvailableTimeSchema>;
