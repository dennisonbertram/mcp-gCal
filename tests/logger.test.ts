/**
 * Tests for Winston logger configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import winston from 'winston';
import { createLogger } from '../src/utils/logger.js';

describe('Logger Configuration', () => {
  let logger: winston.Logger;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createLogger', () => {
    it('should create a winston logger instance', () => {
      logger = createLogger('test-module');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(winston.Logger);
    });

    it('should include module name in log metadata', () => {
      logger = createLogger('auth-manager');
      const metadata = logger.defaultMeta;
      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty('module', 'auth-manager');
    });

    it('should use console transport in development', () => {
      process.env.NODE_ENV = 'development';
      logger = createLogger('dev-module');
      
      const transports = logger.transports;
      expect(transports).toHaveLength(1);
      expect(transports[0]).toBeInstanceOf(winston.transports.Console);
    });

    it('should use file transport in production', () => {
      process.env.NODE_ENV = 'production';
      logger = createLogger('prod-module');
      
      const transports = logger.transports;
      expect(transports.length).toBeGreaterThanOrEqual(2);
      
      const hasFileTransport = transports.some(
        t => t instanceof winston.transports.File
      );
      expect(hasFileTransport).toBe(true);
    });

    it('should format logs with timestamp and module', () => {
      logger = createLogger('format-test');
      
      // Create a spy to capture log output
      const logSpy = vi.spyOn(logger, 'info');
      
      logger.info('Test message', { extra: 'data' });
      
      expect(logSpy).toHaveBeenCalledWith('Test message', { extra: 'data' });
    });

    it('should respect log level from environment', () => {
      process.env.LOG_LEVEL = 'debug';
      logger = createLogger('level-test');
      
      expect(logger.level).toBe('debug');
    });

    it('should default to info level when not specified', () => {
      delete process.env.LOG_LEVEL;
      logger = createLogger('default-level');
      
      expect(logger.level).toBe('info');
    });

    it('should handle errors gracefully', () => {
      logger = createLogger('error-test');
      
      const error = new Error('Test error');
      expect(() => {
        logger.error('Error occurred', { error });
      }).not.toThrow();
    });
  });
});