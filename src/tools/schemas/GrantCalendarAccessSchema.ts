/**
 * Schema for grant-calendar-access tool
 */

import { z } from 'zod';
import { CalendarIdSchema, AclRoleSchema, AclScopeTypeSchema } from './common.js';

export const GrantCalendarAccessSchema = z.object({
  calendarId: CalendarIdSchema,
  role: AclRoleSchema,
  scopeType: AclScopeTypeSchema,
  scopeValue: z
    .string()
    .optional()
    .describe('Email address, group email, or domain (not needed for "default")'),
  sendNotifications: z
    .boolean()
    .optional()
    .describe('Whether to send sharing notifications'),
});

export type GrantCalendarAccessInput = z.infer<typeof GrantCalendarAccessSchema>;
