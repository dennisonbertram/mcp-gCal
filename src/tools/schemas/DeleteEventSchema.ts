/**
 * Schema for delete-event tool
 */

import { z } from 'zod';
import { CalendarIdSchema, EventIdSchema, SendUpdatesSchema } from './common.js';

export const DeleteEventSchema = z.object({
  calendarId: CalendarIdSchema,
  eventId: EventIdSchema,
  sendUpdates: SendUpdatesSchema,
});

export type DeleteEventInput = z.infer<typeof DeleteEventSchema>;
