/**
 * Schema for create-event tool
 */

import { z } from 'zod';
import {
  CalendarIdSchema,
  EventTimeSchema,
  AttendeeSchema,
  SendUpdatesSchema,
} from './common.js';

export const CreateEventSchema = z.object({
  calendarId: CalendarIdSchema,
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
  start: EventTimeSchema.describe('Event start time'),
  end: EventTimeSchema.describe('Event end time'),
  attendees: z
    .array(AttendeeSchema)
    .optional()
    .describe('List of attendees'),
  sendUpdates: SendUpdatesSchema,
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;
