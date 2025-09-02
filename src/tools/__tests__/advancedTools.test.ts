/**
 * Tests for advanced calendar tools
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerAdvancedTools } from '../advancedTools.js';
import { AuthManager } from '../../auth/AuthManager.js';

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    calendar: vi.fn(() => ({
      freebusy: {
        query: vi.fn()
      },
      events: {
        quickAdd: vi.fn()
      },
      acl: {
        list: vi.fn(),
        get: vi.fn(),
        insert: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn()
      }
    }))
  }
}));

// Mock AuthManager
vi.mock('../../auth/AuthManager.js', () => ({
  AuthManager: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue({})
  }))
}));

describe('Advanced Calendar Tools', () => {
  let authManager: AuthManager;
  let tools: ReturnType<typeof registerAdvancedTools>;

  beforeEach(() => {
    vi.clearAllMocks();
    authManager = new AuthManager();
    tools = registerAdvancedTools(authManager);
  });

  describe('gcal-freebusy-query', () => {
    it('should query free/busy information for multiple calendars', async () => {
      const tool = tools.get('gcal-freebusy-query');
      expect(tool).toBeDefined();

      const mockResponse = {
        data: {
          timeMin: '2024-01-01T00:00:00Z',
          timeMax: '2024-01-02T00:00:00Z',
          calendars: {
            'primary': {
              busy: [
                { start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' }
              ]
            },
            'user@example.com': {
              busy: [
                { start: '2024-01-01T14:00:00Z', end: '2024-01-01T15:00:00Z' }
              ]
            }
          }
        }
      };

      const { google } = await import('googleapis');
      const mockQuery = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(google.calendar).mockReturnValue({
        freebusy: { query: mockQuery }
      } as any);

      const result = await tool!.handler({
        calendarIds: 'primary, user@example.com',
        timeMin: '2024-01-01T00:00:00Z',
        timeMax: '2024-01-02T00:00:00Z'
      });

      expect(result.calendars).toHaveLength(2);
      expect(result.calendars[0].calendarId).toBe('primary');
      expect(result.calendars[0].busy).toHaveLength(1);
    });

    it('should parse natural language dates', async () => {
      const tool = tools.get('gcal-freebusy-query');
      expect(tool).toBeDefined();

      const mockResponse = {
        data: {
          timeMin: new Date().toISOString(),
          timeMax: new Date(Date.now() + 86400000).toISOString(),
          calendars: {}
        }
      };

      const { google } = await import('googleapis');
      const mockQuery = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(google.calendar).mockReturnValue({
        freebusy: { query: mockQuery }
      } as any);

      const result = await tool!.handler({
        calendarIds: 'primary',
        timeMin: 'today',
        timeMax: 'tomorrow'
      });

      expect(result).toBeDefined();
      expect(result.timeMin).toBeDefined();
      expect(result.timeMax).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      const tool = tools.get('gcal-freebusy-query');
      expect(tool).toBeDefined();

      const { google } = await import('googleapis');
      const mockCalendar = google.calendar({} as any);
      const mockQuery = vi.fn().mockRejectedValue(new Error('API Error'));
      vi.mocked(google.calendar).mockReturnValue({
        freebusy: { query: mockQuery }
      } as any);

      await expect(
        tool!.handler({
          calendarIds: 'primary',
          timeMin: '2024-01-01T00:00:00Z',
          timeMax: '2024-01-02T00:00:00Z'
        })
      ).rejects.toThrow('Failed to query free/busy');
    });
  });

  describe('gcal-find-available-time', () => {
    it('should find available time slots', async () => {
      const tool = tools.get('gcal-find-available-time');
      expect(tool).toBeDefined();

      const mockResponse = {
        data: {
          calendars: {
            'primary': {
              busy: [
                { start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' },
                { start: '2024-01-01T14:00:00Z', end: '2024-01-01T15:00:00Z' }
              ]
            }
          }
        }
      };

      const { google } = await import('googleapis');
      const mockQuery = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(google.calendar).mockReturnValue({
        freebusy: { query: mockQuery }
      } as any);

      const result = await tool!.handler({
        calendarIds: 'primary',
        duration: 30,
        searchRange: 'tomorrow 9am to 5pm',
        maxSuggestions: 3
      });

      expect(result.availableSlots).toBeDefined();
      expect(result.duration).toBe(30);
      expect(result.calendarsChecked).toContain('primary');
    });

    it('should respect working hours', async () => {
      const tool = tools.get('gcal-find-available-time');
      expect(tool).toBeDefined();

      const mockResponse = {
        data: {
          calendars: {
            'primary': {
              busy: []
            }
          }
        }
      };

      const { google } = await import('googleapis');
      const mockQuery = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(google.calendar).mockReturnValue({
        freebusy: { query: mockQuery }
      } as any);

      const result = await tool!.handler({
        calendarIds: 'primary',
        duration: 60,
        searchRange: 'next week',
        workingHours: { start: '09:00', end: '17:00' },
        maxSuggestions: 5
      });

      expect(result.availableSlots).toBeDefined();
      // All slots should be within working hours
      for (const slot of result.availableSlots) {
        const startHour = new Date(slot.start).getHours();
        expect(startHour).toBeGreaterThanOrEqual(9);
        expect(startHour).toBeLessThan(17);
      }
    });
  });

  describe('gcal-quick-add-event', () => {
    it('should create event from natural language', async () => {
      const tool = tools.get('gcal-quick-add-event');
      expect(tool).toBeDefined();

      const mockResponse = {
        data: {
          id: 'event123',
          summary: 'Meeting with John',
          start: { dateTime: '2024-01-01T14:00:00Z' },
          end: { dateTime: '2024-01-01T15:00:00Z' }
        }
      };

      const { google } = await import('googleapis');
      const mockQuickAdd = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(google.calendar).mockReturnValue({
        events: { quickAdd: mockQuickAdd }
      } as any);

      const result = await tool!.handler({
        calendarId: 'primary',
        text: 'Meeting with John tomorrow at 2pm'
      });

      expect(result.id).toBe('event123');
      expect(result.summary).toBe('Meeting with John');
      expect(result.parsedFrom).toBe('Meeting with John tomorrow at 2pm');
    });

    it('should detect timezone in text', async () => {
      const tool = tools.get('gcal-quick-add-event');
      expect(tool).toBeDefined();

      const mockResponse = {
        data: {
          id: 'event123',
          summary: 'Conference call',
          start: { dateTime: '2024-01-01T17:00:00Z' }
        }
      };

      const { google } = await import('googleapis');
      const mockQuickAdd = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(google.calendar).mockReturnValue({
        events: { quickAdd: mockQuickAdd }
      } as any);

      const result = await tool!.handler({
        calendarId: 'primary',
        text: 'Conference call at 5pm EST'
      });

      expect(result.detectedTimezone).toBe('America/New_York');
    });
  });

  describe('ACL Management Tools', () => {
    describe('gcal-list-calendar-acl', () => {
      it('should list calendar ACL rules', async () => {
        const tool = tools.get('gcal-list-calendar-acl');
        expect(tool).toBeDefined();

        const mockResponse = {
          data: {
            kind: 'calendar#acl',
            items: [
              {
                id: 'user:owner@example.com',
                role: 'owner',
                scope: { type: 'user', value: 'owner@example.com' }
              },
              {
                id: 'user:reader@example.com',
                role: 'reader',
                scope: { type: 'user', value: 'reader@example.com' }
              }
            ]
          }
        };

        const { google } = await import('googleapis');
        const mockList = vi.fn().mockResolvedValue(mockResponse);
        vi.mocked(google.calendar).mockReturnValue({
          acl: { list: mockList }
        } as any);

        const result = await tool!.handler({
          calendarId: 'primary'
        });

        expect(result.rules).toHaveLength(2);
        expect(result.rules[0].role).toBe('owner');
        expect(result.rules[1].role).toBe('reader');
      });
    });

    describe('gcal-create-calendar-acl', () => {
      it('should create new ACL rule', async () => {
        const tool = tools.get('gcal-create-calendar-acl');
        expect(tool).toBeDefined();

        const mockResponse = {
          data: {
            id: 'user:newuser@example.com',
            role: 'writer',
            scope: { type: 'user', value: 'newuser@example.com' }
          }
        };

        const { google } = await import('googleapis');
        const mockInsert = vi.fn().mockResolvedValue(mockResponse);
        vi.mocked(google.calendar).mockReturnValue({
          acl: { insert: mockInsert }
        } as any);

        const result = await tool!.handler({
          calendarId: 'primary',
          role: 'writer',
          scopeType: 'user',
          scopeValue: 'newuser@example.com',
          sendNotifications: true
        });

        expect(result.id).toBe('user:newuser@example.com');
        expect(result.role).toBe('writer');
      });

      it('should validate scope value for non-default types', async () => {
        const tool = tools.get('gcal-create-calendar-acl');
        expect(tool).toBeDefined();

        await expect(
          tool!.handler({
            calendarId: 'primary',
            role: 'reader',
            scopeType: 'user'
            // Missing scopeValue
          })
        ).rejects.toThrow('scopeValue is required for non-default scope types');
      });
    });

    describe('gcal-update-calendar-acl', () => {
      it('should update existing ACL rule', async () => {
        const tool = tools.get('gcal-update-calendar-acl');
        expect(tool).toBeDefined();

        const mockGetResponse = {
          data: {
            id: 'user:user@example.com',
            role: 'reader',
            scope: { type: 'user', value: 'user@example.com' }
          }
        };

        const mockPatchResponse = {
          data: {
            id: 'user:user@example.com',
            role: 'writer',
            scope: { type: 'user', value: 'user@example.com' }
          }
        };

        const { google } = await import('googleapis');
        const mockGet = vi.fn().mockResolvedValue(mockGetResponse);
        const mockPatch = vi.fn().mockResolvedValue(mockPatchResponse);
        vi.mocked(google.calendar).mockReturnValue({
          acl: { get: mockGet, patch: mockPatch }
        } as any);

        const result = await tool!.handler({
          calendarId: 'primary',
          ruleId: 'user:user@example.com',
          role: 'writer'
        });

        expect(result.role).toBe('writer');
      });
    });

    describe('gcal-delete-calendar-acl', () => {
      it('should delete ACL rule', async () => {
        const tool = tools.get('gcal-delete-calendar-acl');
        expect(tool).toBeDefined();

        const { google } = await import('googleapis');
        const mockDelete = vi.fn().mockResolvedValue({});
        vi.mocked(google.calendar).mockReturnValue({
          acl: { delete: mockDelete }
        } as any);

        const result = await tool!.handler({
          calendarId: 'primary',
          ruleId: 'user:user@example.com'
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain('removed');
      });
    });
  });
});