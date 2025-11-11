/**
 * Schema for list-calendar-access tool
 */

import { z } from 'zod';
import { CalendarIdSchema } from './common.js';

export const ListCalendarAccessSchema = z.object({
  calendarId: CalendarIdSchema,
  showDeleted: z
    .boolean()
    .optional()
    .describe('Whether to include deleted access rules'),
  maxResults: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum number of rules to return'),
});

export type ListCalendarAccessInput = z.infer<typeof ListCalendarAccessSchema>;
