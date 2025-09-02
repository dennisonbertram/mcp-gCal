/**
 * Tests for Calendar API TypeScript types
 */

import { describe, it, expect } from 'vitest';
import { 
  validateCalendarEvent,
  validateCalendar,
  validateFreeBusyQuery,
  isValidEventDateTime
} from '../src/types/calendar.js';
import type { 
  CalendarEvent,
  Calendar,
  EventDateTime,
  EventReminder,
  EventAttendee,
  CalendarListEntry,
  EventRecurrence,
  FreeBusyQuery,
  FreeBusyResponse
} from '../src/types/calendar.js';

describe('Calendar API Types', () => {
  describe('CalendarEvent validation', () => {
    it('should validate a complete event structure', () => {
      const event = {
        id: 'event123',
        summary: 'Team Meeting',
        description: 'Weekly sync',
        location: 'Conference Room A',
        start: {
          dateTime: '2025-09-02T10:00:00-05:00',
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: '2025-09-02T11:00:00-05:00',
          timeZone: 'America/New_York'
        },
        attendees: [
          {
            email: 'user@example.com',
            displayName: 'John Doe',
            responseStatus: 'accepted',
            organizer: true
          }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 30 },
            { method: 'popup', minutes: 10 }
          ]
        },
        status: 'confirmed',
        htmlLink: 'https://calendar.google.com/event?eid=...',
        created: '2025-09-01T12:00:00Z',
        updated: '2025-09-01T12:00:00Z'
      };

      const result = validateCalendarEvent(event);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject event without required fields', () => {
      const invalidEvent = {
        description: 'Missing required fields'
      };

      const result = validateCalendarEvent(invalidEvent);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: start');
      expect(result.errors).toContain('Missing required field: end');
    });

    it('should validate EventDateTime format', () => {
      const validDateTime = {
        dateTime: '2025-09-02T09:00:00-05:00',
        timeZone: 'America/New_York'
      };

      expect(isValidEventDateTime(validDateTime)).toBe(true);

      const invalidDateTime = {
        dateTime: 'not-a-date'
      };

      expect(isValidEventDateTime(invalidDateTime)).toBe(false);
    });
  });

  describe('Calendar validation', () => {
    it('should validate calendar structure', () => {
      const calendar = {
        id: 'primary',
        summary: 'Work Calendar',
        description: 'My work schedule',
        timeZone: 'America/New_York',
        backgroundColor: '#1a73e8',
        foregroundColor: '#ffffff',
        selected: true,
        accessRole: 'owner',
        defaultReminders: [
          { method: 'popup', minutes: 10 }
        ],
        conferenceProperties: {
          allowedConferenceSolutionTypes: ['hangoutsMeet']
        }
      };

      const result = validateCalendar(calendar);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('FreeBusy validation', () => {
    it('should validate free/busy query', () => {
      const query = {
        timeMin: '2025-09-02T00:00:00Z',
        timeMax: '2025-09-09T00:00:00Z',
        items: [
          { id: 'user1@example.com' },
          { id: 'user2@example.com' }
        ],
        timeZone: 'UTC',
        groupExpansionMax: 10
      };

      const result = validateFreeBusyQuery(query);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid free/busy query', () => {
      const invalidQuery = {
        items: [{ id: 'user@example.com' }]
        // Missing timeMin and timeMax
      };

      const result = validateFreeBusyQuery(invalidQuery);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: timeMin');
      expect(result.errors).toContain('Missing required field: timeMax');
    });
  });
});