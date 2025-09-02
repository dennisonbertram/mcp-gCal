/**
 * Main MCP server implementation for Google Calendar
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { AuthManager } from './auth/AuthManager.js';
import { registerTools, getToolDefinitions, handleToolCall, ToolRegistry } from './tools/index.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('server');

export interface MCPServerInstance {
  server: Server;
  transport: StdioServerTransport;
  tools: ToolRegistry;
  start: () => Promise<void>;
  close: () => void;
  getRegisteredTools: () => ToolRegistry;
  handleRequest: (request: any) => Promise<any>;
}

/**
 * Create and configure the MCP server
 */
export function createMCPServer(authManager: AuthManager): MCPServerInstance {
  logger.info('Creating MCP server instance');
  
  // Create the MCP server
  const server = new Server(
    {
      name: 'gcalendar-mcp',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  
  // Register tools
  const tools = registerTools(authManager);
  logger.info(`Registered ${tools.size} tools`);
  
  // Set up request handlers
  setupRequestHandlers(server, tools);
  
  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Create server instance
  const instance: MCPServerInstance = {
    server,
    transport,
    tools,
    start: async () => {
      logger.info('Starting MCP server with stdio transport');
      await server.connect(transport);
      logger.info('MCP server started successfully');
    },
    close: () => {
      logger.info('Closing MCP server');
      transport.close();
    },
    getRegisteredTools: () => tools,
    handleRequest: async (request: any) => {
      // This is for testing - simulate request handling
      if (request.method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: request.params.protocolVersion,
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'gcalendar-mcp',
              version: '1.0.0'
            }
          }
        };
      }
      
      if (request.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: getToolDefinitions(tools)
          }
        };
      }
      
      if (request.method === 'tools/call') {
        try {
          const result = await handleToolCall(
            tools,
            request.params.name,
            request.params.arguments || {}
          );
          return {
            jsonrpc: '2.0',
            id: request.id,
            result
          };
        } catch (error) {
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32602,
              message: error instanceof Error ? error.message : 'Tool execution failed'
            }
          };
        }
      }
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      };
    }
  };
  
  return instance;
}

/**
 * Set up request handlers for the MCP server
 */
function setupRequestHandlers(server: Server, tools: ToolRegistry): void {
  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Handling tools/list request');
    const toolDefs = getToolDefinitions(tools);
    
    return {
      tools: toolDefs
    };
  });
  
  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.debug(`Handling tools/call request for tool: ${request.params.name}`);
    
    try {
      const result = await handleToolCall(
        tools,
        request.params.name,
        request.params.arguments || {}
      );
      
      return result;
    } catch (error) {
      logger.error(`Tool execution failed: ${error}`);
      
      if (error instanceof Error && error.message.includes('not found')) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool not found: ${request.params.name}`
        );
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : 'Tool execution failed'
      );
    }
  });
  
  logger.info('Request handlers configured');
}

/**
 * Create and start the MCP server
 */
export async function startServer(authManager: AuthManager): Promise<MCPServerInstance> {
  const instance = createMCPServer(authManager);
  await instance.start();
  return instance;
}