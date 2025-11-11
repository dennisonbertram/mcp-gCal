/**
 * Schema for update-calendar-access tool
 */

import { z } from 'zod';
import { CalendarIdSchema, AclRoleSchema } from './common.js';

export const UpdateCalendarAccessSchema = z.object({
  calendarId: CalendarIdSchema,
  ruleId: z
    .string()
    .min(1)
    .describe('Access rule identifier'),
  role: AclRoleSchema,
  sendNotifications: z
    .boolean()
    .optional()
    .describe('Whether to send update notifications'),
});

export type UpdateCalendarAccessInput = z.infer<typeof UpdateCalendarAccessSchema>;
