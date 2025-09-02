/**
 * Winston logger configuration for Google Calendar MCP server
 */

import winston from 'winston';
import path from 'path';

/**
 * Create a Winston logger instance with module-specific metadata
 * @param moduleName - Name of the module using this logger
 * @returns Configured Winston logger instance
 */
export function createLogger(moduleName: string): winston.Logger {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = process.env.LOG_LEVEL || 'info';

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  );

  // Console format for development - more readable output
  const consoleFormat = winston.format.printf(({ timestamp, level, message, module, ...metadata }) => {
    let msg = `${timestamp} [${level}] [${module}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  });

  // Create transports array
  const transports: winston.transport[] = [];

  if (isProduction) {
    // File transport for errors
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        format: logFormat
      })
    );

    // File transport for all logs
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'combined.log'),
        format: logFormat
      })
    );

    // Console transport for production (structured logs)
    transports.push(
      new winston.transports.Console({
        format: logFormat
      })
    );
  } else {
    // Console transport for development (human-readable)
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
          }),
          winston.format.colorize(),
          consoleFormat
        )
      })
    );
  }

  // Create and return logger
  const logger = winston.createLogger({
    level: logLevel,
    defaultMeta: { module: moduleName },
    transports
  });

  return logger;
}