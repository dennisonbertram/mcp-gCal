/**
 * Tests for MCP tool handler system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { google } from 'googleapis';
import { 
  registerTools,
  handleToolCall,
  getToolDefinitions,
  ToolHandler
} from '../src/tools/index.js';
import { AuthManager } from '../src/auth/AuthManager.js';

// Mock calendar API instance
const mockCalendarApi = {
  calendarList: {
    list: vi.fn()
  },
  calendars: {
    get: vi.fn(),
    insert: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  },
  events: {
    list: vi.fn(),
    get: vi.fn(),
    insert: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
};

// Mock googleapis module
vi.mock('googleapis', () => ({
  google: {
    calendar: vi.fn(() => mockCalendarApi)
  }
}));

describe('Tool Handler System', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create auth manager instance with config
    const config = {
      method: 'oauth2' as const,
      credentialsDir: '/tmp/test-creds',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
      scopes: ['https://www.googleapis.com/auth/calendar']
    };
    authManager = new AuthManager(config, 'test-tenant');
  });

  describe('Tool Registration', () => {
    it('should register calendar tools', () => {
      const tools = registerTools(authManager);
      
      expect(tools).toBeDefined();
      expect(tools.size).toBeGreaterThan(0);
    });

    it('should include essential calendar tools', () => {
      const tools = registerTools(authManager);
      const toolNames = Array.from(tools.keys());
      
      // Check for essential calendar management tools
      expect(toolNames).toContain('list-calendars');
      expect(toolNames).toContain('get-calendar');
      expect(toolNames).toContain('create-calendar');
      expect(toolNames).toContain('update-calendar');
      expect(toolNames).toContain('delete-calendar');
      
      // Check for essential event management tools
      expect(toolNames).toContain('list-events');
      expect(toolNames).toContain('create-event');
      expect(toolNames).toContain('get-event');
      expect(toolNames).toContain('update-event');
      expect(toolNames).toContain('delete-event');
    });

    it('should register tools with proper schemas', () => {
      const tools = registerTools(authManager);
      const listEventsSchema = tools.get('list-events');
      
      expect(listEventsSchema).toBeDefined();
      expect(listEventsSchema?.description).toBeDefined();
      expect(listEventsSchema?.inputSchema).toBeDefined();
      expect(listEventsSchema?.handler).toBeInstanceOf(Function);
    });
  });

  describe('Tool Definitions', () => {
    it('should get tool definitions for MCP protocol', () => {
      const tools = registerTools(authManager);
      const definitions = getToolDefinitions(tools);
      
      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBeGreaterThan(0);
      
      const listEventsDef = definitions.find(d => d.name === 'list-events');
      expect(listEventsDef).toBeDefined();
      expect(listEventsDef?.description).toBeDefined();
      expect(listEventsDef?.inputSchema).toBeDefined();
    });
  });

  describe('Tool Call Handling', () => {
    it('should handle valid tool calls', async () => {
      const tools = registerTools(authManager);
      
      // Mock the auth client method
      const mockAuthClient = {};
      vi.spyOn(authManager, 'authenticate').mockResolvedValue(mockAuthClient as any);
      
      // Mock the Google Calendar API response
      mockCalendarApi.calendarList.list.mockResolvedValue({
        data: {
          kind: 'calendar#calendarList',
          etag: 'test-etag',
          items: []
        }
      } as any);
      
      const result = await handleToolCall(
        tools,
        'list-calendars',
        {}
      );
      
      expect(result).toBeDefined();
      expect(result.toolResult).toBeDefined();
      expect(result.toolResult.calendars).toEqual([]);
    });

    it('should handle tool calls with parameters', async () => {
      const tools = registerTools(authManager);
      
      // Mock the auth client
      const mockAuthClient = {};
      vi.spyOn(authManager, 'authenticate').mockResolvedValue(mockAuthClient as any);
      
      // Mock the Google Calendar API response
      mockCalendarApi.events.list.mockResolvedValue({
        data: {
          kind: 'calendar#events',
          etag: 'test-etag',
          summary: 'Primary',
          items: []
        }
      } as any);
      
      const result = await handleToolCall(
        tools,
        'list-events',
        {
          calendarId: 'primary',
          maxResults: 10,
          timeMin: '2025-09-02T00:00:00Z'
        }
      );
      
      expect(result).toBeDefined();
      expect(result.toolResult).toBeDefined();
      expect(result.toolResult.events).toEqual([]);
    });

    it('should handle invalid tool names', async () => {
      const tools = registerTools(authManager);
      
      await expect(
        handleToolCall(tools, 'non-existent-tool', {})
      ).rejects.toThrow('Tool not found');
    });

    it('should validate required parameters', async () => {
      const tools = registerTools(authManager);
      
      await expect(
        handleToolCall(tools, 'get-event', {
          // Missing required calendarId and eventId
        })
      ).rejects.toThrow(/required/i);
      
      await expect(
        handleToolCall(tools, 'get-calendar', {
          // Missing required calendarId
        })
      ).rejects.toThrow(/required/i);
      
      await expect(
        handleToolCall(tools, 'create-calendar', {
          // Missing required summary
        })
      ).rejects.toThrow(/required/i);
    });

    it('should handle tool execution errors gracefully', async () => {
      const tools = registerTools(authManager);
      
      // Force an auth error
      vi.spyOn(authManager, 'authenticate').mockRejectedValue(
        new Error('Authentication failed')
      );
      
      await expect(
        handleToolCall(tools, 'list-calendars', {})
      ).rejects.toThrow('Authentication failed');
    });

    it('should handle calendar creation with real API integration', async () => {
      const tools = registerTools(authManager);
      
      // Mock auth client
      const mockAuthClient = {};
      vi.spyOn(authManager, 'authenticate').mockResolvedValue(mockAuthClient as any);
      
      // Mock Google Calendar API response for calendar creation
      mockCalendarApi.calendars.insert.mockResolvedValue({
        data: {
          kind: 'calendar#calendar',
          etag: 'test-etag',
          id: 'test-calendar-id@group.calendar.google.com',
          summary: 'Test Calendar',
          description: 'A test calendar',
          timeZone: 'America/New_York'
        }
      } as any);
      
      const result = await handleToolCall(
        tools,
        'create-calendar',
        {
          summary: 'Test Calendar',
          description: 'A test calendar',
          timeZone: 'America/New_York'
        }
      );
      
      expect(result).toBeDefined();
      expect(result.toolResult).toBeDefined();
      expect(result.toolResult.summary).toBe('Test Calendar');
      expect(result.toolResult.id).toBe('test-calendar-id@group.calendar.google.com');
      
      // Verify the API was called with correct parameters
      expect(mockCalendarApi.calendars.insert).toHaveBeenCalledWith({
        requestBody: {
          summary: 'Test Calendar',
          description: 'A test calendar',
          timeZone: 'America/New_York'
        }
      });
    });

    it('should handle API errors with proper error messages', async () => {
      const tools = registerTools(authManager);
      
      // Mock auth client
      const mockAuthClient = {};
      vi.spyOn(authManager, 'authenticate').mockResolvedValue(mockAuthClient as any);
      
      // Mock Google Calendar API to throw a 404 error
      const notFoundError = new Error('Calendar not found');
      (notFoundError as any).code = 404;
      mockCalendarApi.calendars.get.mockRejectedValue(notFoundError);
      
      await expect(
        handleToolCall(tools, 'get-calendar', { calendarId: 'non-existent-calendar' })
      ).rejects.toThrow('Calendar not found: non-existent-calendar');
    });
  });

  describe('Tool Handler Interface', () => {
    it('should implement ToolHandler interface correctly', () => {
      const mockHandler: ToolHandler = {
        name: 'test-tool',
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' }
          }
        },
        handler: async (params) => {
          return { success: true };
        }
      };
      
      expect(mockHandler.name).toBe('test-tool');
      expect(mockHandler.handler).toBeInstanceOf(Function);
    });
  });
});