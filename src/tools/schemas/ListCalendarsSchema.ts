/**
 * Schema for list-calendars tool
 */

import { z } from 'zod';

export const ListCalendarsSchema = z.object({
  showDeleted: z
    .boolean()
    .optional()
    .describe('Whether to include deleted calendar list entries'),
  showHidden: z
    .boolean()
    .optional()
    .describe('Whether to show hidden entries'),
});

export type ListCalendarsInput = z.infer<typeof ListCalendarsSchema>;
