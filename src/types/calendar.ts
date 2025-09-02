/**
 * TypeScript types for Google Calendar API
 * Based on Calendar API v3 documentation
 */

// Event date/time representation
export interface EventDateTime {
  date?: string;              // Date in format "yyyy-mm-dd" for all-day events
  dateTime?: string;          // Combined date-time value (RFC3339)
  timeZone?: string;          // IANA Time Zone Database name
}

// Event reminder
export interface EventReminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

// Event attendee
export interface EventAttendee {
  email: string;
  displayName?: string;
  organizer?: boolean;
  self?: boolean;
  resource?: boolean;
  optional?: boolean;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  comment?: string;
  additionalGuests?: number;
}

// Event conferencing
export interface ConferenceData {
  createRequest?: {
    requestId: string;
    conferenceSolutionKey: {
      type: string;
    };
  };
  entryPoints?: Array<{
    entryPointType: string;
    uri: string;
    label?: string;
    pin?: string;
    accessCode?: string;
    meetingCode?: string;
    passcode?: string;
    password?: string;
  }>;
  conferenceSolution?: {
    key: {
      type: string;
    };
    name: string;
    iconUri: string;
  };
  conferenceId?: string;
  signature?: string;
  notes?: string;
}

// Calendar Event
export interface CalendarEvent {
  id?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  created?: string;
  updated?: string;
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
  creator?: {
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  organizer?: {
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  start: EventDateTime;
  end: EventDateTime;
  endTimeUnspecified?: boolean;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: EventDateTime;
  transparency?: 'opaque' | 'transparent';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  iCalUID?: string;
  sequence?: number;
  attendees?: EventAttendee[];
  attendeesOmitted?: boolean;
  extendedProperties?: {
    private?: { [key: string]: string };
    shared?: { [key: string]: string };
  };
  hangoutLink?: string;
  conferenceData?: ConferenceData;
  gadget?: {
    type: string;
    title?: string;
    link?: string;
    iconLink?: string;
    width?: number;
    height?: number;
    display?: string;
    preferences?: { [key: string]: string };
  };
  anyoneCanAddSelf?: boolean;
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  privateCopy?: boolean;
  locked?: boolean;
  reminders?: {
    useDefault: boolean;
    overrides?: EventReminder[];
  };
  source?: {
    url?: string;
    title?: string;
  };
  attachments?: Array<{
    fileUrl: string;
    title?: string;
    mimeType?: string;
    iconLink?: string;
    fileId?: string;
  }>;
  eventType?: 'default' | 'outOfOffice' | 'focusTime';
}

// Calendar
export interface Calendar {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  timeZone?: string;
  summaryOverride?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  hidden?: boolean;
  selected?: boolean;
  accessRole?: 'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  defaultReminders?: EventReminder[];
  notificationSettings?: {
    notifications: Array<{
      type: 'eventCreation' | 'eventChange' | 'eventCancellation' | 'eventResponse' | 'agenda';
      method: 'email';
    }>;
  };
  primary?: boolean;
  deleted?: boolean;
  conferenceProperties?: {
    allowedConferenceSolutionTypes?: string[];
  };
}

// Calendar List Entry
export interface CalendarListEntry extends Calendar {
  kind?: 'calendar#calendarListEntry';
  etag?: string;
}

// Event recurrence (for type safety)
export type EventRecurrence = string[];

// Free/Busy query
export interface FreeBusyQuery {
  timeMin: string;
  timeMax: string;
  timeZone?: string;
  groupExpansionMax?: number;
  calendarExpansionMax?: number;
  items: Array<{
    id: string;
  }>;
}

// Free/Busy response
export interface FreeBusyResponse {
  kind?: 'calendar#freeBusy';
  timeMin: string;
  timeMax: string;
  calendars: {
    [calendarId: string]: {
      errors?: Array<{
        domain: string;
        reason: string;
      }>;
      busy: Array<{
        start: string;
        end: string;
      }>;
    };
  };
  groups?: {
    [groupId: string]: {
      errors?: Array<{
        domain: string;
        reason: string;
      }>;
      calendars: string[];
    };
  };
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a CalendarEvent object
 */
export function validateCalendarEvent(event: any): ValidationResult {
  const errors: string[] = [];
  
  if (!event.start) {
    errors.push('Missing required field: start');
  }
  
  if (!event.end) {
    errors.push('Missing required field: end');
  }
  
  if (event.start && !isValidEventDateTime(event.start)) {
    errors.push('Invalid start date/time format');
  }
  
  if (event.end && !isValidEventDateTime(event.end)) {
    errors.push('Invalid end date/time format');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a Calendar object
 */
export function validateCalendar(calendar: any): ValidationResult {
  const errors: string[] = [];
  
  if (!calendar.id) {
    errors.push('Missing required field: id');
  }
  
  if (calendar.accessRole && !['none', 'freeBusyReader', 'reader', 'writer', 'owner'].includes(calendar.accessRole)) {
    errors.push('Invalid accessRole value');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a FreeBusyQuery object
 */
export function validateFreeBusyQuery(query: any): ValidationResult {
  const errors: string[] = [];
  
  if (!query.timeMin) {
    errors.push('Missing required field: timeMin');
  }
  
  if (!query.timeMax) {
    errors.push('Missing required field: timeMax');
  }
  
  if (!query.items || !Array.isArray(query.items) || query.items.length === 0) {
    errors.push('Missing or empty items array');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if an EventDateTime object is valid
 */
export function isValidEventDateTime(dateTime: any): boolean {
  if (!dateTime || typeof dateTime !== 'object') {
    return false;
  }
  
  // Must have either date or dateTime, but not both
  const hasDate = 'date' in dateTime;
  const hasDateTime = 'dateTime' in dateTime;
  
  if ((!hasDate && !hasDateTime) || (hasDate && hasDateTime)) {
    return false;
  }
  
  if (hasDate) {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(dateTime.date);
  }
  
  if (hasDateTime) {
    // Basic RFC3339 validation
    try {
      const parsed = new Date(dateTime.dateTime);
      return !isNaN(parsed.getTime());
    } catch {
      return false;
    }
  }
  
  return false;
}