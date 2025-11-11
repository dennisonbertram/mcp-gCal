// src/auth/index.ts
// Main exports for Google Calendar authentication module

export { CalendarAuthManager, createCalendarAuth } from './AuthManager.js';
export { loadOAuthCredentials, getTokenPath, getCredentialsDir } from './config.js';
export type { OAuthCredentials, GoogleCredentialsFile } from './config.js';
export type { AuthClient } from './AuthManager.js';
