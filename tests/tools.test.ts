/**
 * Tests for MCP tool handler system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  registerTools,
  handleToolCall,
  getToolDefinitions,
  ToolHandler
} from '../src/tools/index.js';
import { AuthManager } from '../src/auth/AuthManager.js';

describe('Tool Handler System', () => {
  let authManager: AuthManager;

  beforeEach(() => {
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
      
      // Check for essential tools
      expect(toolNames).toContain('list-calendars');
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
      const mockAuthClient = {
        request: vi.fn().mockResolvedValue({
          data: { calendars: [] }
        })
      };
      vi.spyOn(authManager, 'authenticate').mockResolvedValue(mockAuthClient as any);
      
      const result = await handleToolCall(
        tools,
        'list-calendars',
        {}
      );
      
      expect(result).toBeDefined();
      expect(result.toolResult).toBeDefined();
    });

    it('should handle tool calls with parameters', async () => {
      const tools = registerTools(authManager);
      
      // Mock the auth client
      const mockAuthClient = {
        request: vi.fn().mockResolvedValue({
          data: { events: [] }
        })
      };
      vi.spyOn(authManager, 'authenticate').mockResolvedValue(mockAuthClient as any);
      
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