/**
 * Natural language date parsing utility for Google Calendar
 * Uses chrono-node to parse human-readable date/time strings
 */

import * as chrono from 'chrono-node';
import { createLogger } from './logger.js';

const logger = createLogger('dateParser');

export interface ParsedDateTime {
  dateTime?: string;  // RFC3339 timestamp for specific times
  date?: string;      // YYYY-MM-DD for all-day events
  timeZone?: string;  // IANA timezone identifier
}

/**
 * Parse natural language date/time string into Google Calendar format
 * @param input Natural language date/time string
 * @param referenceDate Optional reference date for relative parsing
 * @param timezone Optional timezone for the parsed date
 * @returns Parsed date/time object suitable for Google Calendar API
 */
export function parseNaturalDate(
  input: string,
  referenceDate?: Date,
  timezone?: string
): ParsedDateTime | null {
  try {
    logger.debug('Parsing natural date', { input, referenceDate, timezone });
    
    // Parse the date string
    const parsed = chrono.parseDate(input, referenceDate || new Date());
    
    if (!parsed) {
      logger.warn('Failed to parse date string', { input });
      return null;
    }
    
    // Check if the input suggests an all-day event
    const isAllDay = /\b(all day|entire day|whole day)\b/i.test(input) ||
                    (!input.match(/\d{1,2}:\d{2}/) && !input.match(/\d{1,2}(am|pm)/i));
    
    if (isAllDay) {
      // Format as date only for all-day events
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      
      return {
        date: `${year}-${month}-${day}`
      };
    } else {
      // Format as RFC3339 timestamp
      const isoString = parsed.toISOString();
      
      return {
        dateTime: isoString,
        timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
  } catch (error: any) {
    logger.error('Error parsing natural date', { error: error.message, input });
    return null;
  }
}

/**
 * Parse a date range from natural language
 * @param input Natural language date range string
 * @param timezone Optional timezone for the parsed dates
 * @returns Object with start and end ParsedDateTime objects
 */
export function parseNaturalDateRange(
  input: string,
  timezone?: string
): { start: ParsedDateTime | null; end: ParsedDateTime | null } {
  try {
    logger.debug('Parsing natural date range', { input, timezone });
    
    // Try to parse as a range using chrono
    const results = chrono.parse(input);
    
    if (results.length === 0) {
      logger.warn('No dates found in range string', { input });
      return { start: null, end: null };
    }
    
    // Check if we have explicit start and end
    if (results.length >= 2) {
      const start = results[0].start.date();
      const end = results[1].start.date();
      
      return {
        start: formatDateTimeForCalendar(start, timezone),
        end: formatDateTimeForCalendar(end, timezone)
      };
    }
    
    // Single result with end component (e.g., "from 2pm to 4pm")
    if (results[0].end) {
      const start = results[0].start.date();
      const end = results[0].end.date();
      
      return {
        start: formatDateTimeForCalendar(start, timezone),
        end: formatDateTimeForCalendar(end, timezone)
      };
    }
    
    // Single date/time with duration hints
    const start = results[0].start.date();
    let end = new Date(start);
    
    // Check for duration hints in the input
    if (/\b(\d+)\s*hour/i.test(input)) {
      const hours = parseInt(input.match(/\b(\d+)\s*hour/i)![1]);
      end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    } else if (/\b(\d+)\s*min/i.test(input)) {
      const minutes = parseInt(input.match(/\b(\d+)\s*min/i)![1]);
      end = new Date(start.getTime() + minutes * 60 * 1000);
    } else if (/all day/i.test(input)) {
      // All-day event
      end.setDate(end.getDate() + 1);
      
      return {
        start: {
          date: formatDateOnly(start)
        },
        end: {
          date: formatDateOnly(end)
        }
      };
    } else {
      // Default to 1 hour duration
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }
    
    return {
      start: formatDateTimeForCalendar(start, timezone),
      end: formatDateTimeForCalendar(end, timezone)
    };
  } catch (error: any) {
    logger.error('Error parsing natural date range', { error: error.message, input });
    return { start: null, end: null };
  }
}

/**
 * Format a Date object for Google Calendar API
 */
function formatDateTimeForCalendar(date: Date, timezone?: string): ParsedDateTime {
  return {
    dateTime: date.toISOString(),
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

/**
 * Format a Date object as date-only string
 */
function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse multiple calendar IDs from a string
 * @param input Comma-separated or space-separated calendar IDs
 * @returns Array of calendar IDs
 */
export function parseCalendarIds(input: string): string[] {
  // Split by comma or semicolon, trim whitespace
  const ids = input.split(/[,;]/).map(id => id.trim()).filter(id => id.length > 0);
  
  // If no delimiters found, check for space-separated emails
  if (ids.length === 1 && ids[0].includes(' ')) {
    const spaceIds = ids[0].split(/\s+/).filter(id => id.includes('@') || id === 'primary');
    if (spaceIds.length > 0) {
      return spaceIds;
    }
  }
  
  return ids;
}

/**
 * Extract time zone from natural language input
 * @param input Natural language string that might contain timezone
 * @returns IANA timezone identifier or null
 */
export function extractTimezone(input: string): string | null {
  // Common timezone patterns
  const timezonePatterns = [
    /\b(EST|EDT|CST|CDT|MST|MDT|PST|PDT)\b/i,
    /\b(Eastern|Central|Mountain|Pacific)\s+(Standard|Daylight)?\s*Time\b/i,
    /\b(America\/\w+|Europe\/\w+|Asia\/\w+|Africa\/\w+|Australia\/\w+)\b/,
    /\bUTC([+-]\d{1,2})?\b/i,
    /\bGMT([+-]\d{1,2})?\b/i
  ];
  
  for (const pattern of timezonePatterns) {
    const match = input.match(pattern);
    if (match) {
      return normalizeTimezone(match[0]);
    }
  }
  
  return null;
}

/**
 * Normalize timezone abbreviations to IANA identifiers
 */
function normalizeTimezone(tz: string): string {
  const tzMap: { [key: string]: string } = {
    'EST': 'America/New_York',
    'EDT': 'America/New_York',
    'EASTERN': 'America/New_York',
    'EASTERN TIME': 'America/New_York',
    'CST': 'America/Chicago',
    'CDT': 'America/Chicago',
    'CENTRAL': 'America/Chicago',
    'CENTRAL TIME': 'America/Chicago',
    'MST': 'America/Denver',
    'MDT': 'America/Denver',
    'MOUNTAIN': 'America/Denver',
    'MOUNTAIN TIME': 'America/Denver',
    'PST': 'America/Los_Angeles',
    'PDT': 'America/Los_Angeles',
    'PACIFIC': 'America/Los_Angeles',
    'PACIFIC TIME': 'America/Los_Angeles',
    'PACIFIC STANDARD TIME': 'America/Los_Angeles',
    'CENTRAL DAYLIGHT TIME': 'America/Chicago',
    'UTC': 'UTC',
    'GMT': 'GMT'
  };
  
  const upperTz = tz.toUpperCase().replace(/\s+(STANDARD|DAYLIGHT)\s+/i, ' ').trim();
  const normalized = tzMap[upperTz];
  return normalized || tz;
}