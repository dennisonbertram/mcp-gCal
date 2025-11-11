/**
 * Schema for update-event tool
 */

import { z } from 'zod';
import {
  CalendarIdSchema,
  EventIdSchema,
  EventTimeSchema,
  SendUpdatesSchema,
} from './common.js';

export const UpdateEventSchema = z.object({
  calendarId: CalendarIdSchema,
  eventId: EventIdSchema,
  summary: z
    .string()
    .optional()
    .describe('Event title'),
  description: z
    .string()
    .optional()
    .describe('Event description'),
  location: z
    .string()
    .optional()
    .describe('Event location'),
  start: EventTimeSchema.optional().describe('Event start time'),
  end: EventTimeSchema.optional().describe('Event end time'),
  sendUpdates: SendUpdatesSchema,
});

export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
