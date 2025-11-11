/**
 * Centralized error handling for Google Calendar API
 * Provides typed error classes and error mapping from Google API responses
 */

import { GaxiosError } from 'googleapis-common';

/**
 * Base error class for all Calendar API errors
 */
export class CalendarAPIError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'CalendarAPIError';
    Object.setPrototypeOf(this, CalendarAPIError.prototype);
  }
}

/**
 * Authentication/authorization errors (401)
 */
export class CalendarAuthError extends CalendarAPIError {
  constructor(message: string, originalError?: unknown) {
    super(message, 401, originalError);
    this.name = 'CalendarAuthError';
    Object.setPrototypeOf(this, CalendarAuthError.prototype);
  }
}

/**
 * Permission/access errors (403)
 */
export class CalendarPermissionError extends CalendarAPIError {
  constructor(message: string, public readonly requiredScopes?: string[], originalError?: unknown) {
    super(message, 403, originalError);
    this.name = 'CalendarPermissionError';
    Object.setPrototypeOf(this, CalendarPermissionError.prototype);
  }
}

/**
 * Resource not found errors (404)
 */
export class CalendarNotFoundError extends CalendarAPIError {
  constructor(message: string, public readonly resourceType?: string, public readonly resourceId?: string, originalError?: unknown) {
    super(message, 404, originalError);
    this.name = 'CalendarNotFoundError';
    Object.setPrototypeOf(this, CalendarNotFoundError.prototype);
  }
}

/**
 * Rate limit errors (429)
 */
export class CalendarRateLimitError extends CalendarAPIError {
  constructor(message: string, public readonly retryAfter?: number, originalError?: unknown) {
    super(message, 429, originalError);
    this.name = 'CalendarRateLimitError';
    Object.setPrototypeOf(this, CalendarRateLimitError.prototype);
  }
}

/**
 * Validation errors (400)
 */
export class CalendarValidationError extends CalendarAPIError {
  constructor(message: string, public readonly field?: string, originalError?: unknown) {
    super(message, 400, originalError);
    this.name = 'CalendarValidationError';
    Object.setPrototypeOf(this, CalendarValidationError.prototype);
  }
}

/**
 * Conflict errors (409)
 */
export class CalendarConflictError extends CalendarAPIError {
  constructor(message: string, originalError?: unknown) {
    super(message, 409, originalError);
    this.name = 'CalendarConflictError';
    Object.setPrototypeOf(this, CalendarConflictError.prototype);
  }
}

/**
 * Server errors (500+)
 */
export class CalendarServiceError extends CalendarAPIError {
  constructor(message: string, code?: number, originalError?: unknown) {
    super(message, code, originalError);
    this.name = 'CalendarServiceError';
    Object.setPrototypeOf(this, CalendarServiceError.prototype);
  }
}

/**
 * Check if error is a Google API error (GaxiosError)
 */
function isGaxiosError(error: unknown): error is GaxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'response' in error
  );
}

/**
 * Extract error code from various error types
 */
function getErrorCode(error: unknown): number | undefined {
  if (isGaxiosError(error)) {
    return error.response?.status || Number(error.code) || undefined;
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as any).code;
    return typeof code === 'number' ? code : Number(code) || undefined;
  }

  return undefined;
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (isGaxiosError(error)) {
    return error.response?.data?.error?.message || error.message || 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error occurred';
}

/**
 * Handle and transform errors from Google Calendar API
 * Maps Google API errors to our typed error classes with helpful messages
 */
export function handleCalendarError(error: unknown, context?: {
  operation?: string;
  calendarId?: string;
  eventId?: string;
  resourceType?: string;
}): CalendarAPIError {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  // 401 - Authentication errors
  if (code === 401) {
    return new CalendarAuthError(
      'Authentication failed. Your credentials may have expired. Please re-authenticate using "npm run auth".',
      error
    );
  }

  // 403 - Permission errors
  if (code === 403) {
    const requiredScopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    let errorMessage = 'Insufficient permissions to access this resource.';

    if (context?.operation) {
      errorMessage += ` Operation: ${context.operation}.`;
    }

    errorMessage += ` Required scopes: ${requiredScopes.join(', ')}`;

    return new CalendarPermissionError(errorMessage, requiredScopes, error);
  }

  // 404 - Not found errors
  if (code === 404) {
    let errorMessage = 'Resource not found.';

    if (context?.resourceType && context?.calendarId) {
      errorMessage = `${context.resourceType} not found: ${context.calendarId}`;
    } else if (context?.resourceType && context?.eventId) {
      errorMessage = `${context.resourceType} not found: ${context.eventId}`;
      if (context.calendarId) {
        errorMessage += ` in calendar ${context.calendarId}`;
      }
    } else if (context?.calendarId) {
      errorMessage = `Calendar not found: ${context.calendarId}`;
    } else if (context?.eventId) {
      errorMessage = `Event not found: ${context.eventId}`;
    }

    return new CalendarNotFoundError(
      errorMessage,
      context?.resourceType,
      context?.calendarId || context?.eventId,
      error
    );
  }

  // 409 - Conflict errors
  if (code === 409) {
    let errorMessage = 'Resource conflict occurred.';

    if (message.toLowerCase().includes('already exists')) {
      errorMessage = 'Resource already exists. ' + message;
    }

    return new CalendarConflictError(errorMessage, error);
  }

  // 429 - Rate limit errors
  if (code === 429) {
    let retryAfter = 60;
    if (isGaxiosError(error) && error.response?.headers) {
      const headers = error.response.headers as any;
      retryAfter = Number(headers.get?.('retry-after') || headers['retry-after']) || 60;
    }

    return new CalendarRateLimitError(
      `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
      retryAfter,
      error
    );
  }

  // 400 - Validation errors
  if (code === 400) {
    let errorMessage = 'Invalid request parameters. ' + message;

    return new CalendarValidationError(errorMessage, undefined, error);
  }

  // 500+ - Server errors
  if (code && code >= 500) {
    return new CalendarServiceError(
      'Google Calendar service is temporarily unavailable. Please try again later.',
      code,
      error
    );
  }

  // Default - Unknown errors
  return new CalendarAPIError(
    `Calendar operation failed: ${message}`,
    code,
    error
  );
}
