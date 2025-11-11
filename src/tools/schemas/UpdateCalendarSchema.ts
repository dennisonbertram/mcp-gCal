/**
 * Schema for update-calendar tool
 */

import { z } from 'zod';
import { CalendarIdSchema } from './common.js';

export const UpdateCalendarSchema = z.object({
  calendarId: CalendarIdSchema,
  summary: z
    .string()
    .optional()
    .describe('Calendar title/name'),
  description: z
    .string()
    .optional()
    .describe('Calendar description'),
  timeZone: z
    .string()
    .optional()
    .describe('Calendar timezone (e.g., America/New_York)'),
  location: z
    .string()
    .optional()
    .describe('Geographic location of the calendar'),
});

export type UpdateCalendarInput = z.infer<typeof UpdateCalendarSchema>;
