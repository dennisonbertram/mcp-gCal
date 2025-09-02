/**
 * Tests for MCP server initialization and protocol handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMCPServer, MCPServerInstance } from '../src/server.js';
import { AuthManager } from '../src/auth/AuthManager.js';

describe('MCP Server', () => {
  let server: MCPServerInstance;
  let authManager: AuthManager;

  beforeEach(() => {
    // Create auth manager with test config
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

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('Server Creation', () => {
    it('should create an MCP server instance', () => {
      server = createMCPServer(authManager);
      
      expect(server).toBeDefined();
      expect(server.server).toBeDefined();
      expect(server.transport).toBeDefined();
    });

    it('should register calendar tools on creation', () => {
      server = createMCPServer(authManager);
      
      const tools = server.getRegisteredTools();
      expect(tools).toBeDefined();
      expect(tools.size).toBeGreaterThan(0);
      expect(tools.has('list-calendars')).toBe(true);
      expect(tools.has('list-events')).toBe(true);
    });
  });

  describe('Protocol Handlers', () => {
    it('should handle initialize request', async () => {
      server = createMCPServer(authManager);
      
      const response = await server.handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      });
      
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.protocolVersion).toBe('2024-11-05');
      expect(response.result.capabilities).toBeDefined();
      expect(response.result.serverInfo).toBeDefined();
      expect(response.result.serverInfo.name).toBe('gcalendar-mcp');
    });

    it('should handle tools/list request', async () => {
      server = createMCPServer(authManager);
      
      // Initialize first
      await server.handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' }
        }
      });
      
      const response = await server.handleRequest({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      });
      
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);
      expect(response.result.tools.length).toBeGreaterThan(0);
      
      const listCalendarsTool = response.result.tools.find(
        (t: any) => t.name === 'list-calendars'
      );
      expect(listCalendarsTool).toBeDefined();
      expect(listCalendarsTool.description).toBeDefined();
      expect(listCalendarsTool.inputSchema).toBeDefined();
    });

    it('should handle tools/call request', async () => {
      server = createMCPServer(authManager);
      
      // Mock auth
      vi.spyOn(authManager, 'authenticate').mockResolvedValue({
        request: vi.fn().mockResolvedValue({ data: { calendars: [] } })
      } as any);
      
      // Initialize first
      await server.handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' }
        }
      });
      
      const response = await server.handleRequest({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'list-calendars',
          arguments: {}
        }
      });
      
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.toolResult).toBeDefined();
    });

    it('should handle invalid tool calls', async () => {
      server = createMCPServer(authManager);
      
      // Initialize first
      await server.handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' }
        }
      });
      
      const response = await server.handleRequest({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'non-existent-tool',
          arguments: {}
        }
      });
      
      expect(response).toBeDefined();
      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });

  describe('Transport Setup', () => {
    it('should set up stdio transport', () => {
      server = createMCPServer(authManager);
      
      expect(server.transport).toBeDefined();
      expect(server.transport.constructor.name).toContain('StdioServerTransport');
    });
  });

  describe('Server Lifecycle', () => {
    it('should start the server', async () => {
      server = createMCPServer(authManager);
      
      const startPromise = server.start();
      expect(startPromise).toBeInstanceOf(Promise);
      
      // Send a close signal to prevent hanging
      server.close();
    });

    it('should close the server gracefully', () => {
      server = createMCPServer(authManager);
      
      expect(() => server.close()).not.toThrow();
    });
  });
});