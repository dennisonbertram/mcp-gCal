/**
 * Schema for gcal-quick-add-event tool
 */

import { z } from 'zod';
import { CalendarIdSchema, SendUpdatesSchema } from './common.js';

export const QuickAddEventSchema = z.object({
  calendarId: CalendarIdSchema,
  text: z
    .string()
    .min(1)
    .describe('Natural language event description (e.g., "Meeting with John tomorrow at 2pm")'),
  sendUpdates: SendUpdatesSchema,
});

export type QuickAddEventInput = z.infer<typeof QuickAddEventSchema>;
