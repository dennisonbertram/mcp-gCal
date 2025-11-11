/**
 * Schema for gcal-freebusy-query tool
 */

import { z } from 'zod';
import { TimeZoneSchema } from './common.js';

export const FreeBusyQuerySchema = z.object({
  calendarIds: z
    .string()
    .min(1)
    .describe('Comma-separated list of calendar IDs or emails to check'),
  timeMin: z
    .string()
    .min(1)
    .describe('Start of time range (RFC3339 or natural language)'),
  timeMax: z
    .string()
    .min(1)
    .describe('End of time range (RFC3339 or natural language)'),
  timeZone: TimeZoneSchema,
  groupExpansionMax: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Maximum number of calendar IDs in group expansion'),
});

export type FreeBusyQueryInput = z.infer<typeof FreeBusyQuerySchema>;
