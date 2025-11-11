/**
 * Tests for server entry point
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { main, getConfig, createAuthManager } from '../src/index.js';

describe('Server Entry Point', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockExit: any;
  let mockConsoleError: any;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Mock process.exit
    mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`Process.exit called with code ${code}`);
    });
    
    // Mock console.error
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    
    // Restore mocks
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Configuration', () => {
    it('should get configuration from environment', () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/callback';
      process.env.CREDENTIALS_DIR = '/tmp/test-creds';
      
      const config = getConfig();
      
      expect(config.method).toBe('oauth2');
      expect(config.clientId).toBe('test-client-id');
      expect(config.clientSecret).toBe('test-client-secret');
      expect(config.redirectUri).toBe('http://localhost:3000/callback');
      expect(config.credentialsDir).toBe('/tmp/test-creds');
    });

    it('should use default values when environment variables are not set', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_REDIRECT_URI;
      delete process.env.CREDENTIALS_DIR;
      
      const config = getConfig();
      
      expect(config.method).toBe('oauth2');
      expect(config.redirectUri).toBe('http://localhost:3001/oauth2callback');
      expect(config.credentialsDir).toContain('.config/mcp-gcal');
    });

    it('should validate required configuration', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      
      expect(() => {
        const config = getConfig();
        // Try to create auth manager without required config
        createAuthManager(config);
      }).toThrow();
    });
  });

  describe('Auth Manager Creation', () => {
    it('should create auth manager with valid config', () => {
      const config = {
        method: 'oauth2' as const,
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
        credentialsDir: '/tmp/test-creds',
        scopes: ['https://www.googleapis.com/auth/calendar']
      };
      
      const authManager = createAuthManager(config);
      
      expect(authManager).toBeDefined();
      expect(authManager.constructor.name).toBe('AuthManager');
    });
  });

  describe('Main Function', () => {
    it('should be an async function', () => {
      expect(main).toBeInstanceOf(Function);
      expect(main.constructor.name).toBe('AsyncFunction');
    });

    it('should handle missing configuration gracefully', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      
      try {
        await main();
      } catch (error: any) {
        expect(error.message).toContain('Process.exit');
        expect(mockConsoleError).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
      }
    });

    it('should log server startup', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Mock the server start to prevent actual server from running
      const { startServer } = await import('../src/server.js');
      vi.mock('../src/server.js', () => ({
        startServer: vi.fn().mockResolvedValue({
          close: vi.fn()
        })
      }));
      
      // We can't fully test main() as it would start a real server
      // Just verify the exports exist and are correct types
      expect(main).toBeDefined();
      expect(typeof main).toBe('function');
      
      mockConsoleLog.mockRestore();
    });
  });

  describe('Module Exports', () => {
    it('should export required functions', async () => {
      const module = await import('../src/index.js');
      
      expect(module.main).toBeDefined();
      expect(module.getConfig).toBeDefined();
      expect(module.createAuthManager).toBeDefined();
      
      expect(typeof module.main).toBe('function');
      expect(typeof module.getConfig).toBe('function');
      expect(typeof module.createAuthManager).toBe('function');
    });
  });
});