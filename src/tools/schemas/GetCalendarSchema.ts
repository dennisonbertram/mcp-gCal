/**
 * Schema for get-calendar tool
 */

import { z } from 'zod';
import { CalendarIdSchema } from './common.js';

export const GetCalendarSchema = z.object({
  calendarId: CalendarIdSchema,
});

export type GetCalendarInput = z.infer<typeof GetCalendarSchema>;
