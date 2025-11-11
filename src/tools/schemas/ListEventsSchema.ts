/**
 * Schema for list-events tool
 */

import { z } from 'zod';
import { CalendarIdSchema, TimeZoneSchema } from './common.js';

export const ListEventsSchema = z.object({
  calendarId: CalendarIdSchema,
  timeMin: z
    .string()
    .optional()
    .describe('Lower bound for event start time (RFC3339 timestamp or natural language)'),
  timeMax: z
    .string()
    .optional()
    .describe('Upper bound for event start time (RFC3339 timestamp or natural language)'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(2500)
    .optional()
    .describe('Maximum number of events to return'),
  q: z
    .string()
    .optional()
    .describe('Free text search terms'),
  showDeleted: z
    .boolean()
    .optional()
    .describe('Whether to include deleted events'),
  singleEvents: z
    .boolean()
    .optional()
    .describe('Whether to expand recurring events'),
  orderBy: z
    .enum(['startTime', 'updated'])
    .optional()
    .describe('Order of the events returned'),
  timeZone: TimeZoneSchema,
});

export type ListEventsInput = z.infer<typeof ListEventsSchema>;
