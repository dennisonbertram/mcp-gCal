/**
 * Domain-specific validation utilities for Google Calendar data
 */

/**
 * Valid IANA timezone identifiers (subset of most common ones)
 * Full list would be very long, so we validate format instead
 */
const TIMEZONE_PATTERN = /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/;

/**
 * Calendar ID pattern - typically email address or special identifier
 */
const CALENDAR_ID_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^primary$|^[a-zA-Z0-9_-]+$/;

/**
 * Email address pattern (RFC 5322 simplified)
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * RFC3339 timestamp pattern
 */
const RFC3339_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Date-only pattern (YYYY-MM-DD)
 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate calendar ID format
 * Accepts email addresses, "primary", or alphanumeric IDs
 */
export function isValidCalendarId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  return CALENDAR_ID_PATTERN.test(id);
}

/**
 * Validate timezone identifier
 * Checks format like "America/New_York" or "Europe/London"
 */
export function isValidTimeZone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') {
    return false;
  }

  // Check pattern
  if (!TIMEZONE_PATTERN.test(tz)) {
    return false;
  }

  // Try to use with Intl API to verify it's a real timezone
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  return EMAIL_PATTERN.test(email);
}

/**
 * Validate RFC3339 timestamp format
 */
export function isValidRFC3339(timestamp: string): boolean {
  if (!timestamp || typeof timestamp !== 'string') {
    return false;
  }

  if (!RFC3339_PATTERN.test(timestamp)) {
    return false;
  }

  // Try to parse as date to verify it's valid
  try {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Validate date-only format (YYYY-MM-DD)
 */
export function isValidDate(date: string): boolean {
  if (!date || typeof date !== 'string') {
    return false;
  }

  if (!DATE_PATTERN.test(date)) {
    return false;
  }

  // Try to parse as date to verify it's valid
  try {
    const parts = date.split('-').map(Number);
    if (parts.length !== 3) return false;

    const [year, month, day] = parts;
    if (year === undefined || month === undefined || day === undefined) return false;

    const d = new Date(year, month - 1, day);
    return (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    );
  } catch {
    return false;
  }
}

/**
 * Validate event ID format
 * Google Calendar event IDs are typically alphanumeric with underscores
 */
export function isValidEventId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Event IDs are typically lowercase alphanumeric with underscores
  return /^[a-z0-9_]+$/i.test(id);
}

/**
 * Validate ACL role
 */
export function isValidAclRole(role: string): boolean {
  const validRoles = ['none', 'freeBusyReader', 'reader', 'writer', 'owner'];
  return validRoles.includes(role);
}

/**
 * Validate ACL scope type
 */
export function isValidAclScopeType(type: string): boolean {
  const validTypes = ['default', 'user', 'group', 'domain'];
  return validTypes.includes(type);
}

/**
 * Validate that a number is within a specific range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * Validate visibility setting
 */
export function isValidVisibility(visibility: string): boolean {
  const validValues = ['default', 'public', 'private', 'confidential'];
  return validValues.includes(visibility);
}

/**
 * Validate event status
 */
export function isValidEventStatus(status: string): boolean {
  const validStatuses = ['confirmed', 'tentative', 'cancelled'];
  return validStatuses.includes(status);
}

/**
 * Validate send updates parameter
 */
export function isValidSendUpdates(sendUpdates: string): boolean {
  const validValues = ['all', 'externalOnly', 'none'];
  return validValues.includes(sendUpdates);
}

/**
 * Validate order by parameter for event listing
 */
export function isValidOrderBy(orderBy: string): boolean {
  const validValues = ['startTime', 'updated'];
  return validValues.includes(orderBy);
}
