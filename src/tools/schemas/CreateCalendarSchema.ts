/**
 * Schema for create-calendar tool
 */

import { z } from 'zod';

export const CreateCalendarSchema = z.object({
  summary: z
    .string()
    .min(1)
    .describe('Calendar title/name'),
  description: z
    .string()
    .optional()
    .describe('Calendar description'),
  timeZone: z
    .string()
    .optional()
    .describe('Calendar timezone (e.g., America/New_York)'),
  location: z
    .string()
    .optional()
    .describe('Geographic location of the calendar'),
});

export type CreateCalendarInput = z.infer<typeof CreateCalendarSchema>;
