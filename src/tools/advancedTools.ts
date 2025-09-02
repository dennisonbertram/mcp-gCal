/**
 * Advanced calendar tools for Google Calendar MCP server
 * Includes free/busy queries, smart scheduling, and permission management
 */

import { google } from 'googleapis';
import { AuthManager } from '../auth/AuthManager.js';
import { createLogger } from '../utils/logger.js';
import { parseNaturalDate, parseNaturalDateRange, parseCalendarIds, extractTimezone } from '../utils/dateParser.js';
import type { ToolHandler } from './index.js';

const logger = createLogger('advancedTools');

/**
 * Register advanced calendar tools
 */
export function registerAdvancedTools(authManager: AuthManager): Map<string, ToolHandler> {
  const tools = new Map<string, ToolHandler>();

  // Free/Busy Query Tool
  tools.set('gcal-freebusy-query', {
    name: 'gcal-freebusy-query',
    description: 'Check availability across multiple calendars using free/busy information',
    inputSchema: {
      type: 'object',
      properties: {
        calendarIds: {
          type: 'string',
          description: 'Comma-separated list of calendar IDs or emails to check'
        },
        timeMin: {
          type: 'string',
          description: 'Start of time range (RFC3339 or natural language)'
        },
        timeMax: {
          type: 'string',
          description: 'End of time range (RFC3339 or natural language)'
        },
        timeZone: {
          type: 'string',
          description: 'IANA timezone (e.g., America/New_York)'
        },
        groupExpansionMax: {
          type: 'number',
          description: 'Maximum number of calendar IDs in group expansion'
        }
      },
      required: ['calendarIds', 'timeMin', 'timeMax']
    },
    handler: async (params) => {
      logger.info('Querying free/busy information', params);
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Parse calendar IDs
        const calendarIds = parseCalendarIds(params.calendarIds);
        if (calendarIds.length === 0) {
          throw new Error('No valid calendar IDs provided');
        }
        
        // Parse time range with natural language support
        let timeMin = params.timeMin;
        let timeMax = params.timeMax;
        
        // Try natural language parsing if not RFC3339 format
        if (!timeMin.match(/^\d{4}-\d{2}-\d{2}T/)) {
          const parsed = parseNaturalDate(timeMin, undefined, params.timeZone);
          if (parsed?.dateTime) {
            timeMin = parsed.dateTime;
          }
        }
        
        if (!timeMax.match(/^\d{4}-\d{2}-\d{2}T/)) {
          const parsed = parseNaturalDate(timeMax, undefined, params.timeZone);
          if (parsed?.dateTime) {
            timeMax = parsed.dateTime;
          }
        }
        
        // Prepare free/busy query
        const items = calendarIds.map(id => ({ id }));
        
        const requestBody: any = {
          timeMin,
          timeMax,
          items
        };
        
        if (params.timeZone) {
          requestBody.timeZone = params.timeZone;
        }
        
        if (params.groupExpansionMax) {
          requestBody.groupExpansionMax = params.groupExpansionMax;
        }
        
        // Make real API call to Google Calendar
        const response = await calendar.freebusy.query({
          requestBody
        });
        
        logger.info('Successfully retrieved free/busy information', {
          calendarsChecked: calendarIds.length,
          timeRange: { timeMin, timeMax }
        });
        
        // Process the response to make it more readable
        const results: any = {
          timeMin: response.data.timeMin,
          timeMax: response.data.timeMax,
          calendars: []
        };
        
        if (response.data.calendars) {
          for (const [calendarId, calendarData] of Object.entries(response.data.calendars)) {
            results.calendars.push({
              calendarId,
              busy: calendarData.busy || [],
              errors: calendarData.errors
            });
          }
        }
        
        // Format response as readable text
        let summary = `**Free/Busy Query Results**\n`;
        summary += `Time Range: ${results.timeMin} to ${results.timeMax}\n\n`;
        
        for (const cal of results.calendars) {
          summary += `📅 **${cal.calendarId}**\n`;
          if (cal.busy && cal.busy.length > 0) {
            summary += `   🔴 Busy periods:\n`;
            for (const busy of cal.busy) {
              summary += `      - ${busy.start} to ${busy.end}\n`;
            }
          } else {
            summary += `   ✅ Available during entire time range\n`;
          }
          if (cal.errors && cal.errors.length > 0) {
            summary += `   ⚠️ Errors: ${cal.errors.map((e: any) => e.reason).join(', ')}\n`;
          }
          summary += `\n`;
        }
        
        return {
          content: [{ type: "text", text: summary }]
        };
      } catch (error: any) {
        logger.error('Failed to query free/busy information', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to query free/busy information');
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to query free/busy: ${error.message}`);
        }
      }
    }
  });

  // Find Available Time Tool
  tools.set('gcal-find-available-time', {
    name: 'gcal-find-available-time',
    description: 'Smart meeting time finder that suggests available slots across multiple calendars',
    inputSchema: {
      type: 'object',
      properties: {
        calendarIds: {
          type: 'string',
          description: 'Comma-separated list of calendar IDs to check for availability'
        },
        duration: {
          type: 'number',
          description: 'Meeting duration in minutes'
        },
        searchRange: {
          type: 'string',
          description: 'Time range to search (e.g., "next week", "tomorrow 9am to 5pm")'
        },
        timeZone: {
          type: 'string',
          description: 'IANA timezone for scheduling'
        },
        workingHours: {
          type: 'object',
          description: 'Preferred working hours (e.g., { start: "09:00", end: "17:00" })'
        },
        maxSuggestions: {
          type: 'number',
          description: 'Maximum number of time slots to suggest (default: 5)'
        }
      },
      required: ['calendarIds', 'duration', 'searchRange']
    },
    handler: async (params) => {
      logger.info('Finding available time slots', params);
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Parse parameters
        const calendarIds = parseCalendarIds(params.calendarIds);
        const durationMs = params.duration * 60 * 1000;
        const maxSuggestions = params.maxSuggestions || 5;
        
        // Parse search range
        const { start: rangeStart, end: rangeEnd } = parseNaturalDateRange(
          params.searchRange,
          params.timeZone
        );
        
        if (!rangeStart?.dateTime || !rangeEnd?.dateTime) {
          throw new Error('Could not parse search range');
        }
        
        // Query free/busy information
        const freeBusyResponse = await calendar.freebusy.query({
          requestBody: {
            timeMin: rangeStart.dateTime,
            timeMax: rangeEnd.dateTime,
            timeZone: params.timeZone,
            items: calendarIds.map(id => ({ id }))
          }
        });
        
        // Collect all busy times across calendars
        const busyTimes: Array<{ start: Date; end: Date }> = [];
        
        if (freeBusyResponse.data.calendars) {
          for (const calendarData of Object.values(freeBusyResponse.data.calendars)) {
            if (calendarData.busy) {
              for (const busy of calendarData.busy) {
                busyTimes.push({
                  start: new Date(busy.start!),
                  end: new Date(busy.end!)
                });
              }
            }
          }
        }
        
        // Sort busy times by start time
        busyTimes.sort((a, b) => a.start.getTime() - b.start.getTime());
        
        // Find available slots
        const availableSlots: Array<{ start: string; end: string; duration: number }> = [];
        const searchStart = new Date(rangeStart.dateTime);
        const searchEnd = new Date(rangeEnd.dateTime);
        
        // Apply working hours if specified
        const workingHours = params.workingHours || { start: '00:00', end: '23:59' };
        const [workStartHour, workStartMin] = workingHours.start.split(':').map(Number);
        const [workEndHour, workEndMin] = workingHours.end.split(':').map(Number);
        
        // Check slots between busy times
        let currentTime = new Date(searchStart);
        
        for (let dayOffset = 0; dayOffset < 30 && availableSlots.length < maxSuggestions; dayOffset++) {
          const dayStart = new Date(searchStart);
          dayStart.setDate(dayStart.getDate() + dayOffset);
          dayStart.setHours(workStartHour, workStartMin, 0, 0);
          
          const dayEnd = new Date(searchStart);
          dayEnd.setDate(dayEnd.getDate() + dayOffset);
          dayEnd.setHours(workEndHour, workEndMin, 0, 0);
          
          // Skip if outside search range
          if (dayStart > searchEnd) break;
          
          currentTime = new Date(Math.max(dayStart.getTime(), searchStart.getTime()));
          const effectiveDayEnd = new Date(Math.min(dayEnd.getTime(), searchEnd.getTime()));
          
          while (currentTime < effectiveDayEnd && availableSlots.length < maxSuggestions) {
            const slotEnd = new Date(currentTime.getTime() + durationMs);
            
            // Check if this slot conflicts with any busy time
            let hasConflict = false;
            for (const busy of busyTimes) {
              if (
                (currentTime >= busy.start && currentTime < busy.end) ||
                (slotEnd > busy.start && slotEnd <= busy.end) ||
                (currentTime <= busy.start && slotEnd >= busy.end)
              ) {
                hasConflict = true;
                // Move current time to end of busy period
                currentTime = new Date(busy.end);
                break;
              }
            }
            
            if (!hasConflict && slotEnd <= effectiveDayEnd) {
              availableSlots.push({
                start: currentTime.toISOString(),
                end: slotEnd.toISOString(),
                duration: params.duration
              });
              
              // Move to next potential slot (with 15-minute increments)
              currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
            } else if (!hasConflict) {
              // Slot extends beyond working hours
              break;
            }
          }
        }
        
        logger.info(`Found ${availableSlots.length} available time slots`);
        
        // Format response as readable text
        let summary = `**Available Time Suggestions**\n\n`;
        summary += `Looking for ${params.duration} minute slots in: ${params.searchRange}\n\n`;
        
        if (availableSlots.length > 0) {
          summary += `Found ${availableSlots.length} available time slots:\n\n`;
          for (let i = 0; i < Math.min(availableSlots.length, params.maxSuggestions || 5); i++) {
            const slot = availableSlots[i];
            const startTime = new Date(slot.start).toLocaleString();
            const endTime = new Date(slot.end).toLocaleString();
            summary += `${i + 1}. **${startTime}** - ${endTime}\n`;
          }
        } else {
          summary += `No available time slots found for the specified criteria.\n`;
          summary += `\nChecked ${calendarIds.length} calendars and found ${busyTimes.length} busy periods.\n`;
        }
        
        return {
          content: [{ type: "text", text: summary }]
        };
      } catch (error: any) {
        logger.error('Failed to find available time', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to check calendar availability');
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to find available time: ${error.message}`);
        }
      }
    }
  });

  // Quick Add Event Tool
  tools.set('gcal-quick-add-event', {
    name: 'gcal-quick-add-event',
    description: 'Create an event using natural language (e.g., "Meeting with John tomorrow at 2pm")',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier (use "primary" for main calendar)'
        },
        text: {
          type: 'string',
          description: 'Natural language event description'
        },
        sendUpdates: {
          type: 'string',
          enum: ['all', 'externalOnly', 'none'],
          description: 'Whether to send notifications'
        }
      },
      required: ['calendarId', 'text']
    },
    handler: async (params) => {
      logger.info('Quick adding event', params);
      
      if (!params.calendarId || !params.text) {
        throw new Error('calendarId and text are required');
      }
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Extract timezone if specified in the text
        const timezone = extractTimezone(params.text);
        
        // Prepare API parameters
        const apiParams: any = {
          calendarId: params.calendarId,
          text: params.text
        };
        
        if (params.sendUpdates) {
          apiParams.sendUpdates = params.sendUpdates;
        }
        
        // Make real API call to Google Calendar quickAdd
        const response = await calendar.events.quickAdd(apiParams);
        
        logger.info(`Successfully created event via quickAdd: ${response.data.summary} (${response.data.id})`);
        
        // Format response as readable text
        const event = response.data;
        const summary = `✅ **Event Created from Natural Language!**\n\n` +
          `**${event.summary || 'Quick Event'}**\n` +
          `- Original text: "${params.text}"\n` +
          `- ID: ${event.id}\n` +
          `- Time: ${event.start?.dateTime || event.start?.date} - ${event.end?.dateTime || event.end?.date}\n` +
          (event.location ? `- Location: ${event.location}\n` : '') +
          (event.description ? `- Description: ${event.description}\n` : '') +
          `- Calendar: ${params.calendarId}\n` +
          (timezone ? `- Detected timezone: ${timezone}\n` : '');
        
        return {
          content: [{ type: "text", text: summary }]
        };
      } catch (error: any) {
        logger.error('Failed to quick add event', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to create events');
        } else if (error.code === 404) {
          throw new Error(`Calendar not found: ${params.calendarId}`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to quick add event: ${error.message}`);
        }
      }
    }
  });

  // List Calendar ACL Tool
  tools.set('gcal-list-calendar-acl', {
    name: 'gcal-list-calendar-acl',
    description: 'List calendar access control (sharing) permissions',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier'
        },
        showDeleted: {
          type: 'boolean',
          description: 'Whether to include deleted ACL rules'
        }
      },
      required: ['calendarId']
    },
    handler: async (params) => {
      logger.info('Listing calendar ACL', params);
      
      if (!params.calendarId) {
        throw new Error('calendarId is required');
      }
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Prepare API parameters
        const apiParams: any = {
          calendarId: params.calendarId
        };
        
        if (params.showDeleted) {
          apiParams.showDeleted = params.showDeleted;
        }
        
        // Make real API call to Google Calendar
        const response = await calendar.acl.list(apiParams);
        
        logger.info(`Successfully retrieved ${response.data.items?.length || 0} ACL rules for calendar ${params.calendarId}`);
        
        // Format response as readable text
        const acls = response.data.items || [];
        let summary = `**Calendar Access Control (Sharing) Permissions**\n\n`;
        summary += `Calendar: ${params.calendarId}\n\n`;
        
        if (acls.length > 0) {
          summary += `Found ${acls.length} access rules:\n\n`;
          for (const acl of acls) {
            const scopeText = acl.scope?.type === 'default' ? 'Default (Public)' : 
                             acl.scope?.type === 'user' ? `User: ${acl.scope.value}` :
                             acl.scope?.type === 'group' ? `Group: ${acl.scope.value}` :
                             acl.scope?.type === 'domain' ? `Domain: ${acl.scope.value}` :
                             'Unknown scope';
            summary += `👥 **${scopeText}**\n`;
            summary += `   Role: ${acl.role}\n`;
            summary += `   ID: ${acl.id}\n\n`;
          }
        } else {
          summary += `No sharing permissions found (private calendar).\n`;
        }
        
        return {
          content: [{ type: "text", text: summary }]
        };
      } catch (error: any) {
        logger.error('Failed to list calendar ACL', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to view calendar sharing settings');
        } else if (error.code === 404) {
          throw new Error(`Calendar not found: ${params.calendarId}`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to list calendar ACL: ${error.message}`);
        }
      }
    }
  });

  // Create Calendar ACL Tool
  tools.set('gcal-create-calendar-acl', {
    name: 'gcal-create-calendar-acl',
    description: 'Share calendar with a user or group by creating an ACL rule',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier'
        },
        role: {
          type: 'string',
          enum: ['none', 'freeBusyReader', 'reader', 'writer', 'owner'],
          description: 'Permission level to grant'
        },
        scopeType: {
          type: 'string',
          enum: ['default', 'user', 'group', 'domain'],
          description: 'Type of grantee'
        },
        scopeValue: {
          type: 'string',
          description: 'Email address, group email, or domain (not needed for "default")'
        },
        sendNotifications: {
          type: 'boolean',
          description: 'Whether to send sharing notifications'
        }
      },
      required: ['calendarId', 'role', 'scopeType']
    },
    handler: async (params) => {
      logger.info('Creating calendar ACL rule', params);
      
      if (!params.calendarId || !params.role || !params.scopeType) {
        throw new Error('calendarId, role, and scopeType are required');
      }
      
      // Validate scope value is provided for non-default types
      if (params.scopeType !== 'default' && !params.scopeValue) {
        throw new Error('scopeValue is required for non-default scope types');
      }
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Prepare ACL rule
        const aclRule: any = {
          role: params.role,
          scope: {
            type: params.scopeType
          }
        };
        
        if (params.scopeValue) {
          aclRule.scope.value = params.scopeValue;
        }
        
        // Prepare API parameters
        const apiParams: any = {
          calendarId: params.calendarId,
          requestBody: aclRule
        };
        
        if (params.sendNotifications !== undefined) {
          apiParams.sendNotifications = params.sendNotifications;
        }
        
        // Make real API call to Google Calendar
        const response = await calendar.acl.insert(apiParams);
        
        logger.info(`Successfully created ACL rule for calendar ${params.calendarId}`, {
          role: params.role,
          scopeType: params.scopeType,
          scopeValue: params.scopeValue
        });
        
        const rule = response.data;
        const scopeText = rule.scope?.type === 'default' ? 'Default (Public)' : 
                         rule.scope?.type === 'user' ? `User: ${rule.scope.value}` :
                         rule.scope?.type === 'group' ? `Group: ${rule.scope.value}` :
                         rule.scope?.type === 'domain' ? `Domain: ${rule.scope.value}` :
                         'Unknown scope';
        
        const summary = `✅ **Calendar Sharing Permission Created!**\n\n` +
          `**${scopeText}**\n` +
          `- Role: ${rule.role}\n` +
          `- Calendar: ${params.calendarId}\n` +
          `- Rule ID: ${rule.id}\n` +
          `- Created: ${new Date().toISOString()}\n`;
        
        return {
          content: [{ type: "text", text: summary }]
        };
      } catch (error: any) {
        logger.error('Failed to create calendar ACL', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to share calendar');
        } else if (error.code === 404) {
          throw new Error(`Calendar not found: ${params.calendarId}`);
        } else if (error.code === 409) {
          throw new Error('ACL rule already exists for this scope');
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to create calendar ACL: ${error.message}`);
        }
      }
    }
  });

  // Update Calendar ACL Tool
  tools.set('gcal-update-calendar-acl', {
    name: 'gcal-update-calendar-acl',
    description: 'Modify existing calendar sharing permissions',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier'
        },
        ruleId: {
          type: 'string',
          description: 'ACL rule identifier'
        },
        role: {
          type: 'string',
          enum: ['none', 'freeBusyReader', 'reader', 'writer', 'owner'],
          description: 'New permission level'
        },
        sendNotifications: {
          type: 'boolean',
          description: 'Whether to send update notifications'
        }
      },
      required: ['calendarId', 'ruleId', 'role']
    },
    handler: async (params) => {
      logger.info('Updating calendar ACL rule', params);
      
      if (!params.calendarId || !params.ruleId || !params.role) {
        throw new Error('calendarId, ruleId, and role are required');
      }
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // First, get the existing rule
        const existingRule = await calendar.acl.get({
          calendarId: params.calendarId,
          ruleId: params.ruleId
        });
        
        // Update the role
        const updatedRule = {
          ...existingRule.data,
          role: params.role
        };
        
        // Prepare API parameters
        const apiParams: any = {
          calendarId: params.calendarId,
          ruleId: params.ruleId,
          requestBody: updatedRule
        };
        
        if (params.sendNotifications !== undefined) {
          apiParams.sendNotifications = params.sendNotifications;
        }
        
        // Make real API call to Google Calendar
        const response = await calendar.acl.patch(apiParams);
        
        logger.info(`Successfully updated ACL rule ${params.ruleId} for calendar ${params.calendarId}`, {
          newRole: params.role
        });
        
        const rule = response.data;
        const scopeText = rule.scope?.type === 'default' ? 'Default (Public)' : 
                         rule.scope?.type === 'user' ? `User: ${rule.scope.value}` :
                         rule.scope?.type === 'group' ? `Group: ${rule.scope.value}` :
                         rule.scope?.type === 'domain' ? `Domain: ${rule.scope.value}` :
                         'Unknown scope';
        
        const summary = `✅ **Calendar Sharing Permission Updated!**\n\n` +
          `**${scopeText}**\n` +
          `- New Role: ${rule.role}\n` +
          `- Calendar: ${params.calendarId}\n` +
          `- Rule ID: ${rule.id}\n` +
          `- Updated: ${new Date().toISOString()}\n`;
        
        return {
          content: [{ type: "text", text: summary }]
        };
      } catch (error: any) {
        logger.error('Failed to update calendar ACL', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to modify calendar sharing');
        } else if (error.code === 404) {
          throw new Error(`Calendar or ACL rule not found`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to update calendar ACL: ${error.message}`);
        }
      }
    }
  });

  // Delete Calendar ACL Tool
  tools.set('gcal-delete-calendar-acl', {
    name: 'gcal-delete-calendar-acl',
    description: 'Remove calendar sharing access for a user or group',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          type: 'string',
          description: 'Calendar identifier'
        },
        ruleId: {
          type: 'string',
          description: 'ACL rule identifier (or email for user rules)'
        },
        sendNotifications: {
          type: 'boolean',
          description: 'Whether to send removal notifications'
        }
      },
      required: ['calendarId', 'ruleId']
    },
    handler: async (params) => {
      logger.info('Deleting calendar ACL rule', params);
      
      if (!params.calendarId || !params.ruleId) {
        throw new Error('calendarId and ruleId are required');
      }
      
      try {
        const auth = await authManager.authenticate();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Prepare API parameters
        const apiParams: any = {
          calendarId: params.calendarId,
          ruleId: params.ruleId
        };
        
        if (params.sendNotifications !== undefined) {
          apiParams.sendNotifications = params.sendNotifications;
        }
        
        // Make real API call to Google Calendar
        await calendar.acl.delete(apiParams);
        
        logger.info(`Successfully deleted ACL rule ${params.ruleId} from calendar ${params.calendarId}`);
        
        return {
          content: [{ 
            type: "text", 
            text: `✅ **Calendar Sharing Permission Removed!**\n\nACL rule ${params.ruleId} has been permanently removed from calendar ${params.calendarId}.`
          }]
        };
      } catch (error: any) {
        logger.error('Failed to delete calendar ACL', { error: error.message });
        
        if (error.code === 401) {
          throw new Error('Authentication failed - please re-authenticate');
        } else if (error.code === 403) {
          throw new Error('Insufficient permissions to remove calendar sharing');
        } else if (error.code === 404) {
          throw new Error(`Calendar or ACL rule not found`);
        } else if (error.code >= 500) {
          throw new Error('Google Calendar service temporarily unavailable');
        } else {
          throw new Error(`Failed to delete calendar ACL: ${error.message}`);
        }
      }
    }
  });

  return tools;
}