#!/usr/bin/env node

/**
 * Entry point for the Google Calendar MCP server using mcp-framework
 */

import { MCPServer } from 'mcp-framework';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = new MCPServer({
  name: 'mcp-gcal',
  version: '0.1.0',
  basePath: __dirname
});

await server.start();
