/**
 * Schema for revoke-calendar-access tool
 */

import { z } from 'zod';
import { CalendarIdSchema } from './common.js';

export const RevokeCalendarAccessSchema = z.object({
  calendarId: CalendarIdSchema,
  ruleId: z
    .string()
    .min(1)
    .describe('Access rule identifier (or email for user rules)'),
  sendNotifications: z
    .boolean()
    .optional()
    .describe('Whether to send removal notifications'),
});

export type RevokeCalendarAccessInput = z.infer<typeof RevokeCalendarAccessSchema>;
