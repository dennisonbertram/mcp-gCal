/**
 * Schema for delete-calendar tool
 */

import { z } from 'zod';
import { CalendarIdSchema } from './common.js';

export const DeleteCalendarSchema = z.object({
  calendarId: CalendarIdSchema,
});

export type DeleteCalendarInput = z.infer<typeof DeleteCalendarSchema>;
