/**
 * Schema for get-event tool
 */

import { z } from 'zod';
import { CalendarIdSchema, EventIdSchema, TimeZoneSchema } from './common.js';

export const GetEventSchema = z.object({
  calendarId: CalendarIdSchema,
  eventId: EventIdSchema,
  timeZone: TimeZoneSchema,
});

export type GetEventInput = z.infer<typeof GetEventSchema>;
