/**
 * Common Zod schemas shared across multiple tools
 */

import { z } from 'zod';

/**
 * Calendar ID schema - accepts email, "primary", or alphanumeric ID
 */
export const CalendarIdSchema = z
  .string()
  .min(1)
  .describe('Calendar identifier (use "primary" for main calendar)');

/**
 * Event ID schema
 */
export const EventIdSchema = z
  .string()
  .min(1)
  .describe('Event identifier');

/**
 * RFC3339 timestamp or date string
 */
export const DateTimeSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: 'Must be a valid RFC3339 timestamp or date string',
  })
  .describe('RFC3339 timestamp (e.g., "2024-01-15T10:00:00Z")');

/**
 * IANA timezone
 */
export const TimeZoneSchema = z
  .string()
  .optional()
  .describe('IANA timezone (e.g., "America/New_York")');

/**
 * Email address
 */
export const EmailSchema = z
  .string()
  .email()
  .describe('Email address');

/**
 * Event start/end time object
 */
export const EventTimeSchema = z.object({
  dateTime: z.string().optional().describe('RFC3339 timestamp with timezone'),
  date: z.string().optional().describe('Date only (YYYY-MM-DD) for all-day events'),
  timeZone: TimeZoneSchema,
});

/**
 * Attendee object
 */
export const AttendeeSchema = z.object({
  email: EmailSchema,
  displayName: z.string().optional().describe('Display name of the attendee'),
  optional: z.boolean().optional().describe('Whether attendance is optional'),
  responseStatus: z
    .enum(['needsAction', 'declined', 'tentative', 'accepted'])
    .optional()
    .describe('Response status'),
  comment: z.string().optional().describe('Comment by the attendee'),
  additionalGuests: z.number().optional().describe('Number of additional guests'),
});

/**
 * Send updates parameter
 */
export const SendUpdatesSchema = z
  .enum(['all', 'externalOnly', 'none'])
  .optional()
  .describe('Whether to send notifications about the change');

/**
 * ACL role
 */
export const AclRoleSchema = z
  .enum(['none', 'freeBusyReader', 'reader', 'writer', 'owner'])
  .describe('Permission level');

/**
 * ACL scope type
 */
export const AclScopeTypeSchema = z
  .enum(['default', 'user', 'group', 'domain'])
  .describe('Type of grantee (default = public)');

/**
 * Order by parameter for listing
 */
export const OrderBySchema = z
  .enum(['startTime', 'updated'])
  .optional()
  .describe('Order of the events returned (default: startTime)');
