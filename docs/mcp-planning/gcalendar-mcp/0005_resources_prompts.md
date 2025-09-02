# Resources & Prompts Implementation

## Overview
This task implements dynamic resources that provide contextual calendar information to the LLM and interactive prompts that guide users through common calendar workflows. Resources enhance the LLM's understanding of the user's calendar state, while prompts provide structured templates for complex operations.

## Dependencies
- Requires completion of Tasks 0001-0004 (all core functionality)
- Resources rely on calendar and event tools for data retrieval
- Prompts orchestrate multiple tools to complete workflows

## Resources to Implement

### Resource 1: `calendar://recent-events`
**Purpose**: Provide context about recently modified or created events

**Implementation**:
```typescript
class RecentEventsResource implements Resource {
  uri = 'calendar://recent-events';
  name = 'Recent Calendar Events';
  description = 'Recently created or modified events across all calendars';
  mimeType = 'application/json';
  
  async read(): Promise<ResourceContent> {
    const auth = await this.authManager.getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    
    try {
      // Get events modified in the last 7 days
      const updatedMin = new Date();
      updatedMin.setDate(updatedMin.getDate() - 7);
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        updatedMin: updatedMin.toISOString(),
        orderBy: 'updated',
        maxResults: 20,
        singleEvents: true,
      });
      
      const events = response.data.items || [];
      
      const content = {
        lastUpdated: new Date().toISOString(),
        count: events.length,
        events: events.map(event => ({
          id: event.id,
          summary: event.summary,
          start: event.start,
          end: event.end,
          created: event.created,
          updated: event.updated,
          status: event.status,
          organizer: event.organizer?.email,
          attendees: event.attendees?.length || 0,
          hasConference: !!event.conferenceData,
        })),
      };
      
      return {
        uri: this.uri,
        mimeType: this.mimeType,
        text: JSON.stringify(content, null, 2),
      };
    } catch (error) {
      throw new ResourceError('Failed to fetch recent events', error);
    }
  }
}
```

### Resource 2: `calendar://upcoming-events`
**Purpose**: Provide context about upcoming events in the next period

**Implementation**:
```typescript
class UpcomingEventsResource implements Resource {
  uri = 'calendar://upcoming-events';
  name = 'Upcoming Calendar Events';
  description = 'Events scheduled for the next 7 days';
  mimeType = 'application/json';
  
  async read(params?: { days?: number; calendars?: string[] }): Promise<ResourceContent> {
    const auth = await this.authManager.getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    
    try {
      const timeMin = new Date();
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + (params?.days || 7));
      
      const calendarsToCheck = params?.calendars || ['primary'];
      const allEvents = [];
      
      for (const calendarId of calendarsToCheck) {
        const response = await calendar.events.list({
          calendarId,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 50,
        });
        
        const events = response.data.items || [];
        allEvents.push(...events.map(e => ({ ...e, calendarId })));
      }
      
      // Sort all events by start time
      allEvents.sort((a, b) => {
        const aTime = new Date(a.start?.dateTime || a.start?.date!);
        const bTime = new Date(b.start?.dateTime || b.start?.date!);
        return aTime.getTime() - bTime.getTime();
      });
      
      // Group by day
      const eventsByDay = groupEventsByDay(allEvents);
      
      const content = {
        timeRange: {
          start: timeMin.toISOString(),
          end: timeMax.toISOString(),
        },
        totalEvents: allEvents.length,
        calendarsChecked: calendarsToCheck,
        eventsByDay,
        nextEvent: allEvents[0] ? {
          summary: allEvents[0].summary,
          start: allEvents[0].start,
          location: allEvents[0].location,
          timeUntil: getTimeUntil(allEvents[0].start),
        } : null,
      };
      
      return {
        uri: this.uri,
        mimeType: this.mimeType,
        text: JSON.stringify(content, null, 2),
      };
    } catch (error) {
      throw new ResourceError('Failed to fetch upcoming events', error);
    }
  }
}

function groupEventsByDay(events: any[]): any {
  const grouped: any = {};
  
  events.forEach(event => {
    const date = event.start?.dateTime 
      ? new Date(event.start.dateTime).toDateString()
      : event.start?.date;
    
    if (!grouped[date]) {
      grouped[date] = [];
    }
    
    grouped[date].push({
      time: event.start?.dateTime 
        ? new Date(event.start.dateTime).toLocaleTimeString()
        : 'All day',
      summary: event.summary,
      duration: calculateDuration(event.start, event.end),
      location: event.location,
    });
  });
  
  return grouped;
}

function getTimeUntil(start: any): string {
  const now = new Date();
  const eventTime = new Date(start.dateTime || start.date);
  const diff = eventTime.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `in ${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return 'now';
  }
}
```

### Resource 3: `calendar://calendars-list`
**Purpose**: Provide information about available calendars

**Implementation**:
```typescript
class CalendarsListResource implements Resource {
  uri = 'calendar://calendars-list';
  name = 'Available Calendars';
  description = 'List of calendars accessible to the user';
  mimeType = 'application/json';
  
  async read(): Promise<ResourceContent> {
    const auth = await this.authManager.getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    
    try {
      const response = await calendar.calendarList.list({
        maxResults: 250,
        showHidden: true,
      });
      
      const calendars = response.data.items || [];
      
      const content = {
        totalCalendars: calendars.length,
        primaryCalendar: calendars.find(c => c.primary)?.id,
        calendars: calendars.map(cal => ({
          id: cal.id,
          summary: cal.summary,
          description: cal.description,
          accessRole: cal.accessRole,
          primary: cal.primary,
          selected: cal.selected,
          hidden: cal.hidden,
          backgroundColor: cal.backgroundColor,
          foregroundColor: cal.foregroundColor,
          timeZone: cal.timeZone,
          defaultReminders: cal.defaultReminders,
        })),
        writableCalendars: calendars
          .filter(c => c.accessRole === 'writer' || c.accessRole === 'owner')
          .map(c => ({ id: c.id, summary: c.summary })),
        sharedCalendars: calendars
          .filter(c => !c.primary && c.accessRole !== 'owner')
          .map(c => ({ id: c.id, summary: c.summary, accessRole: c.accessRole })),
      };
      
      return {
        uri: this.uri,
        mimeType: this.mimeType,
        text: JSON.stringify(content, null, 2),
      };
    } catch (error) {
      throw new ResourceError('Failed to fetch calendars list', error);
    }
  }
}
```

### Resource 4: `calendar://free-busy-status`
**Purpose**: Provide current and near-future availability status

**Implementation**:
```typescript
class FreeBusyStatusResource implements Resource {
  uri = 'calendar://free-busy-status';
  name = 'Free/Busy Status';
  description = 'Current availability and busy periods for today and tomorrow';
  mimeType = 'application/json';
  
  async read(): Promise<ResourceContent> {
    const auth = await this.authManager.getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    
    try {
      const now = new Date();
      const timeMin = new Date();
      timeMin.setHours(0, 0, 0, 0);
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 2);
      timeMax.setHours(0, 0, 0, 0);
      
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: 'primary' }],
        },
      });
      
      const busyPeriods = response.data.calendars?.primary?.busy || [];
      
      // Check current status
      const currentlyBusy = busyPeriods.some(period => {
        const start = new Date(period.start!);
        const end = new Date(period.end!);
        return now >= start && now < end;
      });
      
      // Find next free slot
      let nextFreeStart = now;
      if (currentlyBusy) {
        const currentBusy = busyPeriods.find(period => {
          const start = new Date(period.start!);
          const end = new Date(period.end!);
          return now >= start && now < end;
        });
        if (currentBusy) {
          nextFreeStart = new Date(currentBusy.end!);
        }
      }
      
      // Calculate free time today
      const endOfDay = new Date();
      endOfDay.setHours(18, 0, 0, 0); // Assume workday ends at 6 PM
      
      const freeTimeToday = calculateFreeTime(
        now,
        endOfDay,
        busyPeriods.filter(p => new Date(p.start!) < endOfDay)
      );
      
      const content = {
        timestamp: now.toISOString(),
        currentStatus: currentlyBusy ? 'busy' : 'available',
        currentEvent: currentlyBusy ? await getCurrentEvent(calendar) : null,
        nextFreeTime: currentlyBusy ? nextFreeStart.toISOString() : 'now',
        freeTimeToday: `${Math.round(freeTimeToday / 60)} hours`,
        busyPeriods: busyPeriods.map(period => ({
          start: period.start,
          end: period.end,
          duration: calculateDuration(
            { dateTime: period.start },
            { dateTime: period.end }
          ),
        })),
        todayStats: calculateDayStats(busyPeriods, 0),
        tomorrowStats: calculateDayStats(busyPeriods, 1),
      };
      
      return {
        uri: this.uri,
        mimeType: this.mimeType,
        text: JSON.stringify(content, null, 2),
      };
    } catch (error) {
      throw new ResourceError('Failed to fetch free/busy status', error);
    }
  }
}

async function getCurrentEvent(calendar: any): Promise<any> {
  const now = new Date();
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date(now.getTime() - 60000).toISOString(), // 1 minute ago
    timeMax: new Date(now.getTime() + 60000).toISOString(), // 1 minute ahead
    singleEvents: true,
    maxResults: 1,
  });
  
  return response.data.items?.[0] || null;
}

function calculateFreeTime(start: Date, end: Date, busyPeriods: any[]): number {
  let freeMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  
  busyPeriods.forEach(period => {
    const busyStart = new Date(period.start!);
    const busyEnd = new Date(period.end!);
    
    if (busyEnd > start && busyStart < end) {
      const overlapStart = busyStart > start ? busyStart : start;
      const overlapEnd = busyEnd < end ? busyEnd : end;
      freeMinutes -= (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);
    }
  });
  
  return Math.max(0, freeMinutes);
}

function calculateDayStats(busyPeriods: any[], dayOffset: number): any {
  const day = new Date();
  day.setDate(day.getDate() + dayOffset);
  day.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  
  const dayPeriods = busyPeriods.filter(p => {
    const start = new Date(p.start!);
    return start >= day && start < dayEnd;
  });
  
  const totalBusyMinutes = dayPeriods.reduce((sum, period) => {
    return sum + calculateDuration(
      { dateTime: period.start },
      { dateTime: period.end }
    );
  }, 0);
  
  return {
    date: day.toDateString(),
    totalEvents: dayPeriods.length,
    busyHours: Math.round(totalBusyMinutes / 60 * 10) / 10,
    utilization: Math.round(totalBusyMinutes / (8 * 60) * 100) + '%', // Assume 8-hour workday
  };
}
```

### Resource 5: `calendar://recurring-events`
**Purpose**: Provide information about recurring event series

**Implementation**:
```typescript
class RecurringEventsResource implements Resource {
  uri = 'calendar://recurring-events';
  name = 'Recurring Events';
  description = 'Active recurring event series across calendars';
  mimeType = 'application/json';
  
  async read(): Promise<ResourceContent> {
    const auth = await this.authManager.getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    
    try {
      // Get all events and filter for recurring ones
      const response = await calendar.events.list({
        calendarId: 'primary',
        maxResults: 250,
        singleEvents: false, // Get recurring event definitions
      });
      
      const events = response.data.items || [];
      const recurringEvents = events.filter(e => e.recurrence && e.recurrence.length > 0);
      
      const content = {
        totalRecurring: recurringEvents.length,
        series: await Promise.all(recurringEvents.map(async event => {
          // Get next few instances
          const instances = await calendar.events.instances({
            calendarId: 'primary',
            eventId: event.id!,
            maxResults: 5,
            timeMin: new Date().toISOString(),
          });
          
          return {
            id: event.id,
            summary: event.summary,
            recurrence: event.recurrence,
            pattern: parseRRulePattern(event.recurrence![0]),
            created: event.created,
            nextInstances: instances.data.items?.map(i => ({
              date: i.start?.dateTime || i.start?.date,
              id: i.id,
            })),
            organizer: event.organizer?.email,
            attendees: event.attendees?.length || 0,
          };
        })),
        patterns: summarizePatterns(recurringEvents),
      };
      
      return {
        uri: this.uri,
        mimeType: this.mimeType,
        text: JSON.stringify(content, null, 2),
      };
    } catch (error) {
      throw new ResourceError('Failed to fetch recurring events', error);
    }
  }
}

function parseRRulePattern(rrule: string): string {
  // Simple RRULE parser for common patterns
  const parts = rrule.replace('RRULE:', '').split(';');
  const rules: any = {};
  
  parts.forEach(part => {
    const [key, value] = part.split('=');
    rules[key] = value;
  });
  
  let pattern = '';
  
  switch (rules.FREQ) {
    case 'DAILY':
      pattern = rules.INTERVAL > 1 ? `Every ${rules.INTERVAL} days` : 'Daily';
      break;
    case 'WEEKLY':
      pattern = rules.INTERVAL > 1 ? `Every ${rules.INTERVAL} weeks` : 'Weekly';
      if (rules.BYDAY) {
        pattern += ` on ${rules.BYDAY}`;
      }
      break;
    case 'MONTHLY':
      pattern = rules.INTERVAL > 1 ? `Every ${rules.INTERVAL} months` : 'Monthly';
      break;
    case 'YEARLY':
      pattern = 'Yearly';
      break;
  }
  
  if (rules.COUNT) {
    pattern += ` (${rules.COUNT} occurrences)`;
  } else if (rules.UNTIL) {
    pattern += ` (until ${rules.UNTIL})`;
  }
  
  return pattern;
}

function summarizePatterns(events: any[]): any {
  const patterns = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
    custom: 0,
  };
  
  events.forEach(event => {
    const rrule = event.recurrence?.[0] || '';
    if (rrule.includes('FREQ=DAILY')) patterns.daily++;
    else if (rrule.includes('FREQ=WEEKLY')) patterns.weekly++;
    else if (rrule.includes('FREQ=MONTHLY')) patterns.monthly++;
    else if (rrule.includes('FREQ=YEARLY')) patterns.yearly++;
    else patterns.custom++;
  });
  
  return patterns;
}
```

### Resource 6: `calendar://shared-calendars`
**Purpose**: Provide information about calendars shared with others

**Implementation**:
```typescript
class SharedCalendarsResource implements Resource {
  uri = 'calendar://shared-calendars';
  name = 'Shared Calendars';
  description = 'Calendars shared with other users and their permissions';
  mimeType = 'application/json';
  
  async read(): Promise<ResourceContent> {
    const auth = await this.authManager.getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    
    try {
      // Get all calendars
      const calendarList = await calendar.calendarList.list({
        maxResults: 250,
      });
      
      const calendars = calendarList.data.items || [];
      const sharedInfo = [];
      
      // Check ACL for each owned calendar
      for (const cal of calendars.filter(c => c.accessRole === 'owner')) {
        const aclResponse = await calendar.acl.list({
          calendarId: cal.id!,
        });
        
        const rules = aclResponse.data.items || [];
        const sharedWith = rules.filter(r => 
          r.scope?.type === 'user' && r.role !== 'owner'
        );
        
        if (sharedWith.length > 0) {
          sharedInfo.push({
            calendarId: cal.id,
            calendarName: cal.summary,
            sharedWith: sharedWith.map(r => ({
              email: r.scope?.value,
              role: r.role,
              id: r.id,
            })),
            isPublic: rules.some(r => r.scope?.type === 'default'),
          });
        }
      }
      
      // Calendars shared with me
      const sharedWithMe = calendars.filter(c => 
        !c.primary && c.accessRole !== 'owner'
      );
      
      const content = {
        calendarsIShare: sharedInfo,
        calendarsSharedWithMe: sharedWithMe.map(c => ({
          id: c.id,
          summary: c.summary,
          owner: c.id?.split('@')[0], // Extract owner from calendar ID
          myAccessRole: c.accessRole,
          backgroundColor: c.backgroundColor,
        })),
        totalShared: sharedInfo.length,
        totalSharedWithMe: sharedWithMe.length,
      };
      
      return {
        uri: this.uri,
        mimeType: this.mimeType,
        text: JSON.stringify(content, null, 2),
      };
    } catch (error) {
      throw new ResourceError('Failed to fetch shared calendars', error);
    }
  }
}
```

## Prompts to Implement

### Prompt 1: `schedule_meeting`
**Purpose**: Guide through scheduling a meeting with multiple attendees

**Implementation**:
```typescript
class ScheduleMeetingPrompt implements Prompt {
  name = 'schedule_meeting';
  description = 'Schedule a meeting with attendees and find optimal time';
  
  arguments = [
    {
      name: 'title',
      description: 'Meeting title',
      required: true,
    },
    {
      name: 'attendees',
      description: 'Comma-separated email addresses',
      required: true,
    },
    {
      name: 'duration',
      description: 'Duration in minutes',
      required: true,
    },
    {
      name: 'timeframe',
      description: 'When to schedule (e.g., "next week", "tomorrow")',
      required: false,
    },
    {
      name: 'description',
      description: 'Meeting description/agenda',
      required: false,
    },
  ];
  
  async getTemplate(args: any): Promise<string> {
    return `I'll help you schedule a meeting with the following details:

**Meeting:** ${args.title}
**Attendees:** ${args.attendees}
**Duration:** ${args.duration} minutes
**Timeframe:** ${args.timeframe || 'next 7 days'}
**Description:** ${args.description || 'No description provided'}

Let me find the best time when everyone is available...

1. First, I'll check the availability of all attendees
2. Find common free time slots
3. Suggest the best times based on preferences
4. Create the meeting once you confirm a time

Would you like me to proceed with finding available times?`;
  }
  
  async execute(args: any, tools: ToolManager): Promise<any> {
    // Parse attendees
    const attendees = args.attendees.split(',').map((e: string) => e.trim());
    
    // Determine timeframe
    const timeMin = args.timeframe 
      ? chrono.parseDate(args.timeframe)?.toISOString()
      : new Date().toISOString();
    
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 7);
    
    // Find meeting times
    const suggestions = await tools.call('gcal_find_meeting_time', {
      attendees,
      duration: parseInt(args.duration),
      timeMin,
      timeMax: timeMax.toISOString(),
    });
    
    return {
      suggestions: suggestions.suggestions,
      nextSteps: 'Choose a time slot to create the meeting',
    };
  }
}
```

### Prompt 2: `daily_agenda`
**Purpose**: Get a summary of today's schedule

**Implementation**:
```typescript
class DailyAgendaPrompt implements Prompt {
  name = 'daily_agenda';
  description = 'Get your daily agenda with meetings and free time';
  
  arguments = [
    {
      name: 'date',
      description: 'Date to check (default: today)',
      required: false,
    },
    {
      name: 'includeDetails',
      description: 'Include event details (true/false)',
      required: false,
    },
  ];
  
  async getTemplate(args: any): Promise<string> {
    const date = args.date || 'today';
    return `Here's your agenda for ${date}:`;
  }
  
  async execute(args: any, tools: ToolManager): Promise<any> {
    const targetDate = args.date 
      ? chrono.parseDate(args.date)
      : new Date();
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get events for the day
    const events = await tools.call('gcal_list_events', {
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    // Get free/busy for the day
    const availability = await tools.call('gcal_check_availability', {
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
    });
    
    // Build agenda
    const agenda = {
      date: targetDate.toDateString(),
      totalEvents: events.events.length,
      events: events.events.map((e: any) => ({
        time: formatEventTime(e.start),
        title: e.summary,
        duration: calculateDuration(e.start, e.end),
        location: e.location,
        attendees: args.includeDetails ? e.attendees : undefined,
        description: args.includeDetails ? e.description : undefined,
      })),
      freeTime: availability.freeSlots.map((slot: any) => ({
        start: new Date(slot.start).toLocaleTimeString(),
        end: new Date(slot.end).toLocaleTimeString(),
        duration: slot.duration,
      })),
      summary: {
        busyHours: calculateBusyHours(events.events),
        freeHours: calculateFreeHours(availability.freeSlots),
        firstEvent: events.events[0]?.summary,
        lastEvent: events.events[events.events.length - 1]?.summary,
      },
    };
    
    return agenda;
  }
}
```

### Prompt 3: `block_time`
**Purpose**: Block time on calendar for focused work

**Implementation**:
```typescript
class BlockTimePrompt implements Prompt {
  name = 'block_time';
  description = 'Block time on your calendar for focused work';
  
  arguments = [
    {
      name: 'purpose',
      description: 'What you need time for',
      required: true,
    },
    {
      name: 'duration',
      description: 'How long you need (in minutes)',
      required: true,
    },
    {
      name: 'when',
      description: 'When to block time (e.g., "tomorrow morning")',
      required: false,
    },
    {
      name: 'recurring',
      description: 'Make it recurring (daily/weekly/none)',
      required: false,
    },
  ];
  
  async getTemplate(args: any): Promise<string> {
    return `I'll help you block ${args.duration} minutes for "${args.purpose}".
    
Looking for available time ${args.when || 'in the next few days'}...`;
  }
  
  async execute(args: any, tools: ToolManager): Promise<any> {
    // Parse when to block time
    const when = args.when || 'tomorrow';
    const startSearch = chrono.parseDate(when) || new Date();
    
    // Find available slot
    const availability = await tools.call('gcal_check_availability', {
      timeMin: startSearch.toISOString(),
      timeMax: new Date(startSearch.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    
    // Find a suitable slot
    const suitableSlot = availability.freeSlots.find((slot: any) => 
      slot.duration >= parseInt(args.duration)
    );
    
    if (!suitableSlot) {
      return {
        error: 'No available time found in the specified period',
        suggestion: 'Try a different timeframe or shorter duration',
      };
    }
    
    // Create the event
    const eventData: any = {
      summary: `Focus Time: ${args.purpose}`,
      description: `Blocked time for: ${args.purpose}`,
      start: { dateTime: suitableSlot.start },
      end: { 
        dateTime: new Date(
          new Date(suitableSlot.start).getTime() + parseInt(args.duration) * 60 * 1000
        ).toISOString(),
      },
      transparency: 'opaque', // Show as busy
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 5 }],
      },
    };
    
    // Add recurrence if requested
    if (args.recurring && args.recurring !== 'none') {
      const recurrence = {
        frequency: args.recurring === 'daily' ? 'DAILY' : 'WEEKLY',
        count: 10, // Default to 10 occurrences
      };
      
      const created = await tools.call('gcal_create_recurring_event', {
        ...eventData,
        recurrence,
      });
      
      return {
        created: true,
        event: created,
        message: `Recurring ${args.recurring} focus time blocked`,
      };
    } else {
      const created = await tools.call('gcal_create_event', eventData);
      
      return {
        created: true,
        event: created,
        message: `Focus time blocked on ${new Date(suitableSlot.start).toLocaleString()}`,
      };
    }
  }
}
```

### Prompt 4: `manage_recurring`
**Purpose**: Manage recurring event series

**Implementation**:
```typescript
class ManageRecurringPrompt implements Prompt {
  name = 'manage_recurring';
  description = 'Manage or modify recurring event series';
  
  arguments = [
    {
      name: 'eventName',
      description: 'Name of the recurring event',
      required: true,
    },
    {
      name: 'action',
      description: 'Action to perform (modify/cancel/reschedule)',
      required: true,
    },
    {
      name: 'scope',
      description: 'Apply to (this/thisAndFollowing/all)',
      required: false,
    },
  ];
  
  async getTemplate(args: any): Promise<string> {
    return `Managing recurring event "${args.eventName}"
Action: ${args.action}
Scope: ${args.scope || 'all instances'}`;
  }
  
  async execute(args: any, tools: ToolManager, resources: ResourceManager): Promise<any> {
    // Get recurring events
    const recurringResource = await resources.read('calendar://recurring-events');
    const recurringData = JSON.parse(recurringResource.text);
    
    // Find matching event
    const matchingEvent = recurringData.series.find((s: any) => 
      s.summary.toLowerCase().includes(args.eventName.toLowerCase())
    );
    
    if (!matchingEvent) {
      return {
        error: `No recurring event found matching "${args.eventName}"`,
        availableEvents: recurringData.series.map((s: any) => s.summary),
      };
    }
    
    // Perform action based on request
    switch (args.action) {
      case 'cancel':
        if (args.scope === 'all') {
          await tools.call('gcal_delete_event', {
            eventId: matchingEvent.id,
          });
          return { message: 'Recurring series cancelled' };
        } else {
          // Cancel specific instance
          return { message: 'Instance cancellation requires specific date' };
        }
        
      case 'modify':
        // Would need more details about what to modify
        return {
          eventId: matchingEvent.id,
          currentPattern: matchingEvent.pattern,
          message: 'Please specify what changes to make',
        };
        
      case 'reschedule':
        // Would need new time details
        return {
          eventId: matchingEvent.id,
          currentPattern: matchingEvent.pattern,
          nextInstances: matchingEvent.nextInstances,
          message: 'Please specify new schedule',
        };
        
      default:
        return { error: 'Unknown action' };
    }
  }
}
```

### Prompt 5: `find_free_time`
**Purpose**: Find free time slots for various purposes

**Implementation**:
```typescript
class FindFreeTimePrompt implements Prompt {
  name = 'find_free_time';
  description = 'Find free time slots in your calendar';
  
  arguments = [
    {
      name: 'duration',
      description: 'How much time you need (minutes)',
      required: true,
    },
    {
      name: 'timeframe',
      description: 'When to search (e.g., "this week", "next 3 days")',
      required: false,
    },
    {
      name: 'preferences',
      description: 'Preferences (morning/afternoon/evening)',
      required: false,
    },
  ];
  
  async getTemplate(args: any): Promise<string> {
    return `Finding ${args.duration} minutes of free time ${args.timeframe || 'this week'}...`;
  }
  
  async execute(args: any, tools: ToolManager): Promise<any> {
    const timeframe = args.timeframe || 'next 7 days';
    const timeMin = new Date().toISOString();
    const timeMax = chrono.parseDate(`in ${timeframe}`)?.toISOString() || 
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get availability
    const availability = await tools.call('gcal_check_availability', {
      timeMin,
      timeMax,
    });
    
    // Filter slots by duration
    const suitableSlots = availability.freeSlots.filter((slot: any) => 
      slot.duration >= parseInt(args.duration)
    );
    
    // Apply preferences
    let filteredSlots = suitableSlots;
    if (args.preferences) {
      filteredSlots = suitableSlots.filter((slot: any) => {
        const hour = new Date(slot.start).getHours();
        switch (args.preferences) {
          case 'morning':
            return hour >= 6 && hour < 12;
          case 'afternoon':
            return hour >= 12 && hour < 17;
          case 'evening':
            return hour >= 17 && hour < 22;
          default:
            return true;
        }
      });
    }
    
    // Sort by preference score
    filteredSlots.sort((a: any, b: any) => {
      const aHour = new Date(a.start).getHours();
      const bHour = new Date(b.start).getHours();
      
      // Prefer mid-morning and mid-afternoon
      const aScore = (aHour >= 10 && aHour <= 11) || (aHour >= 14 && aHour <= 15) ? 10 : 0;
      const bScore = (bHour >= 10 && bHour <= 11) || (bHour >= 14 && bHour <= 15) ? 10 : 0;
      
      return bScore - aScore;
    });
    
    return {
      totalSlotsFound: filteredSlots.length,
      slots: filteredSlots.slice(0, 5).map((slot: any) => ({
        start: new Date(slot.start).toLocaleString(),
        end: new Date(slot.end).toLocaleString(),
        duration: slot.duration,
        day: new Date(slot.start).toLocaleDateString('en-US', { weekday: 'long' }),
      })),
      recommendation: filteredSlots[0] ? 
        `Best slot: ${new Date(filteredSlots[0].start).toLocaleString()}` :
        'No suitable slots found',
    };
  }
}
```

### Prompt 6: `calendar_permissions`
**Purpose**: Manage calendar sharing and permissions

**Implementation**:
```typescript
class CalendarPermissionsPrompt implements Prompt {
  name = 'calendar_permissions';
  description = 'Manage who can access your calendars';
  
  arguments = [
    {
      name: 'action',
      description: 'Action to perform (share/revoke/list)',
      required: true,
    },
    {
      name: 'calendar',
      description: 'Calendar name or ID',
      required: false,
    },
    {
      name: 'email',
      description: 'Email address for sharing',
      required: false,
    },
    {
      name: 'role',
      description: 'Access level (reader/writer)',
      required: false,
    },
  ];
  
  async getTemplate(args: any): Promise<string> {
    return `Calendar permissions management:
Action: ${args.action}
${args.calendar ? `Calendar: ${args.calendar}` : ''}
${args.email ? `User: ${args.email}` : ''}
${args.role ? `Role: ${args.role}` : ''}`;
  }
  
  async execute(args: any, tools: ToolManager, resources: ResourceManager): Promise<any> {
    switch (args.action) {
      case 'list':
        const permissions = await tools.call('gcal_list_calendar_permissions', {
          calendarId: args.calendar || 'primary',
        });
        return permissions;
        
      case 'share':
        if (!args.email || !args.role) {
          return { error: 'Email and role required for sharing' };
        }
        
        const shared = await tools.call('gcal_share_calendar', {
          calendarId: args.calendar || 'primary',
          scope: { type: 'user', value: args.email },
          role: args.role,
        });
        return shared;
        
      case 'revoke':
        if (!args.email) {
          return { error: 'Email required for revoking access' };
        }
        
        const revoked = await tools.call('gcal_revoke_calendar_access', {
          calendarId: args.calendar || 'primary',
          scope: { type: 'user', value: args.email },
        });
        return revoked;
        
      default:
        return { error: 'Unknown action' };
    }
  }
}
```

### Prompt 7: `conflict_resolver`
**Purpose**: Resolve scheduling conflicts

**Implementation**:
```typescript
class ConflictResolverPrompt implements Prompt {
  name = 'conflict_resolver';
  description = 'Resolve scheduling conflicts and find alternatives';
  
  arguments = [
    {
      name: 'eventTitle',
      description: 'Title of the event to schedule',
      required: true,
    },
    {
      name: 'proposedTime',
      description: 'Proposed time that has conflicts',
      required: true,
    },
    {
      name: 'duration',
      description: 'Event duration in minutes',
      required: true,
    },
    {
      name: 'attendees',
      description: 'Attendee emails (comma-separated)',
      required: false,
    },
  ];
  
  async getTemplate(args: any): Promise<string> {
    return `Resolving conflicts for "${args.eventTitle}" at ${args.proposedTime}...`;
  }
  
  async execute(args: any, tools: ToolManager): Promise<any> {
    const proposedStart = chrono.parseDate(args.proposedTime);
    if (!proposedStart) {
      return { error: 'Could not parse proposed time' };
    }
    
    const proposedEnd = new Date(
      proposedStart.getTime() + parseInt(args.duration) * 60 * 1000
    );
    
    // Check for conflicts
    const conflicts = await tools.call('gcal_detect_conflicts', {
      start: proposedStart.toISOString(),
      end: proposedEnd.toISOString(),
      checkAttendees: args.attendees ? args.attendees.split(',').map((e: string) => e.trim()) : [],
    });
    
    if (!conflicts.hasConflicts) {
      return {
        message: 'No conflicts found',
        canSchedule: true,
      };
    }
    
    // Find alternative times
    const searchStart = new Date(proposedStart);
    searchStart.setDate(searchStart.getDate() - 1);
    const searchEnd = new Date(proposedStart);
    searchEnd.setDate(searchEnd.getDate() + 7);
    
    const alternatives = await tools.call('gcal_find_meeting_time', {
      attendees: args.attendees ? args.attendees.split(',').map((e: string) => e.trim()) : ['primary'],
      duration: parseInt(args.duration),
      timeMin: searchStart.toISOString(),
      timeMax: searchEnd.toISOString(),
      maxResults: 5,
    });
    
    return {
      conflicts: conflicts.conflicts,
      alternatives: alternatives.suggestions,
      recommendation: alternatives.suggestions[0] || 'No alternative times found',
    };
  }
}
```

### Prompt 8: `weekly_summary`
**Purpose**: Generate a weekly calendar summary

**Implementation**:
```typescript
class WeeklySummaryPrompt implements Prompt {
  name = 'weekly_summary';
  description = 'Get a summary of your week';
  
  arguments = [
    {
      name: 'week',
      description: 'Which week (this/next/last)',
      required: false,
    },
  ];
  
  async getTemplate(args: any): Promise<string> {
    return `Generating ${args.week || 'this'} week's summary...`;
  }
  
  async execute(args: any, tools: ToolManager): Promise<any> {
    const week = args.week || 'this';
    const today = new Date();
    let weekStart = new Date(today);
    let weekEnd = new Date(today);
    
    // Calculate week boundaries
    switch (week) {
      case 'last':
        weekStart.setDate(today.getDate() - today.getDay() - 7);
        weekEnd.setDate(weekStart.getDate() + 6);
        break;
      case 'next':
        weekStart.setDate(today.getDate() - today.getDay() + 7);
        weekEnd.setDate(weekStart.getDate() + 6);
        break;
      default: // this week
        weekStart.setDate(today.getDate() - today.getDay());
        weekEnd.setDate(weekStart.getDate() + 6);
    }
    
    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Get all events for the week
    const events = await tools.call('gcal_list_events', {
      timeMin: weekStart.toISOString(),
      timeMax: weekEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    // Group events by day
    const eventsByDay: any = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    events.events.forEach((event: any) => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      const dayName = dayNames[eventDate.getDay()];
      
      if (!eventsByDay[dayName]) {
        eventsByDay[dayName] = [];
      }
      
      eventsByDay[dayName].push({
        time: event.start.dateTime ? 
          new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
          'All day',
        title: event.summary,
        duration: calculateDuration(event.start, event.end),
      });
    });
    
    // Calculate statistics
    const stats = {
      totalEvents: events.events.length,
      totalMeetings: events.events.filter((e: any) => e.attendees && e.attendees.length > 0).length,
      totalHours: events.events.reduce((sum: number, e: any) => 
        sum + calculateDuration(e.start, e.end) / 60, 0
      ),
      busiestDay: Object.entries(eventsByDay).reduce((max: any, [day, events]: [string, any]) => 
        events.length > (max.count || 0) ? { day, count: events.length } : max, {}
      ),
    };
    
    return {
      weekOf: `${weekStart.toDateString()} - ${weekEnd.toDateString()}`,
      statistics: stats,
      byDay: eventsByDay,
      highlights: {
        mostAttendedEvent: events.events.reduce((max: any, e: any) => 
          (e.attendees?.length || 0) > (max.attendees?.length || 0) ? e : max, {}
        ),
        longestEvent: events.events.reduce((max: any, e: any) => {
          const duration = calculateDuration(e.start, e.end);
          return duration > (max.duration || 0) ? { ...e, duration } : max;
        }, {}),
      },
    };
  }
}
```

## Resource & Prompt Registration

```typescript
class GoogleCalendarMCPServer {
  private registerResources(): void {
    const resources = [
      new RecentEventsResource(),
      new UpcomingEventsResource(),
      new CalendarsListResource(),
      new FreeBusyStatusResource(),
      new RecurringEventsResource(),
      new SharedCalendarsResource(),
    ];
    
    resources.forEach(resource => {
      this.server.setRequestHandler(`resources/${resource.uri}`, async () => {
        return await resource.read();
      });
    });
    
    // List all resources
    this.server.setRequestHandler('resources/list', async () => {
      return {
        resources: resources.map(r => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        })),
      };
    });
  }
  
  private registerPrompts(): void {
    const prompts = [
      new ScheduleMeetingPrompt(),
      new DailyAgendaPrompt(),
      new BlockTimePrompt(),
      new ManageRecurringPrompt(),
      new FindFreeTimePrompt(),
      new CalendarPermissionsPrompt(),
      new ConflictResolverPrompt(),
      new WeeklySummaryPrompt(),
    ];
    
    prompts.forEach(prompt => {
      this.server.setRequestHandler(`prompts/${prompt.name}`, async (request) => {
        const { arguments: args } = request.params;
        const template = await prompt.getTemplate(args);
        const result = await prompt.execute(args, this.toolManager, this.resourceManager);
        return { template, result };
      });
    });
    
    // List all prompts
    this.server.setRequestHandler('prompts/list', async () => {
      return {
        prompts: prompts.map(p => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments,
        })),
      };
    });
  }
}
```

## Testing Strategy

### Phase 1: Resource Testing
```bash
# Test each resource individually
echo '{"jsonrpc":"2.0","method":"resources/read","params":{"uri":"calendar://upcoming-events"},"id":1}' | node server.js

echo '{"jsonrpc":"2.0","method":"resources/read","params":{"uri":"calendar://free-busy-status"},"id":2}' | node server.js

echo '{"jsonrpc":"2.0","method":"resources/list","id":3}' | node server.js
```

### Phase 2: Prompt Testing
```bash
# Test schedule meeting prompt
echo '{"jsonrpc":"2.0","method":"prompts/schedule_meeting","params":{"arguments":{"title":"Team Sync","attendees":"user1@example.com,user2@example.com","duration":"30"}},"id":1}' | node server.js

# Test daily agenda
echo '{"jsonrpc":"2.0","method":"prompts/daily_agenda","params":{"arguments":{}},"id":2}' | node server.js

# Test find free time
echo '{"jsonrpc":"2.0","method":"prompts/find_free_time","params":{"arguments":{"duration":"60","preferences":"morning"}},"id":3}' | node server.js
```

### Phase 3: Integration Testing
```javascript
// Test resource updates after tool operations
const before = await mcp.readResource('calendar://upcoming-events');
await mcp.callTool('gcal_create_event', { /* event data */ });
const after = await mcp.readResource('calendar://upcoming-events');
// Verify resource reflects the new event

// Test prompt with resource context
const result = await mcp.executePrompt('weekly_summary', {});
// Verify summary includes data from resources
```

## Success Criteria

### Resource Requirements
- [ ] All resources return valid JSON
- [ ] Resources update in real-time
- [ ] Resource caching with TTL
- [ ] Error handling for API failures
- [ ] Efficient batch fetching

### Prompt Requirements
- [ ] All prompts have clear templates
- [ ] Prompts execute complete workflows
- [ ] Natural language handling
- [ ] Error recovery in workflows
- [ ] Clear user guidance

### Performance Requirements
- [ ] Resources load in < 2s
- [ ] Prompt execution < 5s
- [ ] Caching reduces API calls by 50%
- [ ] Batch operations where possible

## Deliverables

1. **Implementation Files**:
   - `src/resources/calendar-resources.ts`
   - `src/prompts/calendar-prompts.ts`
   - `src/utils/resource-cache.ts`

2. **Test Files**:
   - `tests/resources/resources.test.ts`
   - `tests/prompts/prompts.test.ts`

3. **Documentation**:
   - Resource usage guide
   - Prompt examples
   - Workflow documentation

This implementation provides rich contextual information and guided workflows for calendar management.