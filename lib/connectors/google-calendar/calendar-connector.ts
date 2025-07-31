/**
 * Google Calendar Connector
 * Provides capabilities to read and manage Google Calendar events
 */

import { 
  BaseConnector, 
  ConnectorContext, 
  ConnectorRequest, 
  ConnectorResponse,
  ConnectorMetadata 
} from '../types';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    optional?: boolean;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
  status?: string;
  htmlLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
}

export interface CalendarListParams {
  calendarId?: string;
  timeMin?: Date;
  timeMax?: Date;
  maxResults?: number;
  q?: string;
  showDeleted?: boolean;
  singleEvents?: boolean;
}

export class GoogleCalendarConnector extends BaseConnector {
  private accessToken?: string;
  private refreshToken?: string;

  constructor() {
    super({
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Connect to Google Calendar to view events, check availability, and manage your schedule',
      icon: 'calendar',
      category: 'productivity',
      capabilities: [
        {
          name: 'listEvents',
          description: 'List calendar events within a time range',
          inputSchema: {
            type: 'object',
            properties: {
              calendarId: { type: 'string', default: 'primary' },
              timeMin: { type: 'string', format: 'date-time' },
              timeMax: { type: 'string', format: 'date-time' },
              maxResults: { type: 'number', default: 10 },
              q: { type: 'string', description: 'Free text search' },
              singleEvents: { type: 'boolean', default: true }
            }
          }
        },
        {
          name: 'getEvent',
          description: 'Get a specific calendar event',
          inputSchema: {
            type: 'object',
            properties: {
              calendarId: { type: 'string', default: 'primary' },
              eventId: { type: 'string', required: true }
            }
          }
        },
        {
          name: 'searchEvents',
          description: 'Search for events by keyword',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', required: true },
              timeMin: { type: 'string', format: 'date-time' },
              timeMax: { type: 'string', format: 'date-time' }
            }
          }
        },
        {
          name: 'getUpcomingEvents',
          description: 'Get upcoming events for the next N days',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'number', default: 7 },
              maxResults: { type: 'number', default: 10 }
            }
          }
        },
        {
          name: 'checkAvailability',
          description: 'Check availability for a specific time period',
          inputSchema: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date', required: true },
              startTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
              endTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' }
            }
          }
        },
        {
          name: 'listCalendars',
          description: 'List all available calendars',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ],
      requiredAuth: {
        type: 'oauth2',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/calendar.events.readonly'
        ]
      },
      rateLimit: {
        maxRequestsPerMinute: 60,
        maxRequestsPerHour: 1000,
        maxRequestsPerDay: 10000
      }
    });
  }

  async connect(context: ConnectorContext): Promise<void> {
    this.context = context;
    
    if (context.auth?.accessToken) {
      this.accessToken = context.auth.accessToken;
      this.refreshToken = context.auth.refreshToken;
    }
  }

  async disconnect(): Promise<void> {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.context = undefined;
  }

  async execute(request: ConnectorRequest): Promise<ConnectorResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated. Please connect to Google Calendar first.');
      }

      let data: any;

      switch (request.capability) {
        case 'listEvents':
          data = await this.listEvents(request.params as CalendarListParams);
          break;
        
        case 'getEvent':
          data = await this.getEvent(
            request.params.calendarId || 'primary',
            request.params.eventId
          );
          break;
        
        case 'searchEvents':
          data = await this.searchEvents({
            query: request.params.query || '',
            timeMin: request.params.timeMin,
            timeMax: request.params.timeMax
          });
          break;
        
        case 'getUpcomingEvents':
          data = await this.getUpcomingEvents(
            request.params.days || 7,
            request.params.maxResults || 10
          );
          break;
        
        case 'checkAvailability':
          data = await this.checkAvailability({
            date: request.params.date || new Date().toISOString(),
            startTime: request.params.startTime,
            endTime: request.params.endTime
          });
          break;
        
        case 'listCalendars':
          data = await this.listCalendars();
          break;
        
        default:
          throw new Error(`Unknown capability: ${request.capability}`);
      }

      return {
        success: true,
        data,
        metadata: {
          requestId: `gcal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          requestId: `gcal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  private async listEvents(params: CalendarListParams): Promise<CalendarEvent[]> {
    const queryParams = new URLSearchParams({
      ...(params.timeMin && { timeMin: new Date(params.timeMin).toISOString() }),
      ...(params.timeMax && { timeMax: new Date(params.timeMax).toISOString() }),
      ...(params.maxResults && { maxResults: params.maxResults.toString() }),
      ...(params.q && { q: params.q }),
      ...(params.showDeleted !== undefined && { showDeleted: params.showDeleted.toString() }),
      ...(params.singleEvents !== undefined && { singleEvents: params.singleEvents.toString() }),
      orderBy: 'startTime'
    });

    const calendarId = params.calendarId || 'primary';
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  private async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get event: ${response.statusText}`);
    }

    return await response.json();
  }

  private async searchEvents(params: {
    query: string;
    timeMin?: string;
    timeMax?: string;
  }): Promise<CalendarEvent[]> {
    return this.listEvents({
      calendarId: 'primary',
      q: params.query,
      timeMin: params.timeMin ? new Date(params.timeMin) : undefined,
      timeMax: params.timeMax ? new Date(params.timeMax) : undefined,
      singleEvents: true,
      maxResults: 20
    });
  }

  private async getUpcomingEvents(days: number, maxResults: number): Promise<CalendarEvent[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.listEvents({
      calendarId: 'primary',
      timeMin: now,
      timeMax: futureDate,
      singleEvents: true,
      maxResults
    });
  }

  private async checkAvailability(params: {
    date: string;
    startTime?: string;
    endTime?: string;
  }): Promise<{
    date: string;
    busyPeriods: Array<{ start: string; end: string }>;
    availablePeriods: Array<{ start: string; end: string }>;
  }> {
    const date = new Date(params.date);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all events for the day
    const events = await this.listEvents({
      calendarId: 'primary',
      timeMin: startOfDay,
      timeMax: endOfDay,
      singleEvents: true
    });

    // Extract busy periods
    const busyPeriods = events
      .filter(event => event.start.dateTime && event.end.dateTime)
      .map(event => ({
        start: event.start.dateTime!,
        end: event.end.dateTime!
      }))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Calculate available periods
    const availablePeriods: Array<{ start: string; end: string }> = [];
    
    if (busyPeriods.length === 0) {
      availablePeriods.push({
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString()
      });
    } else {
      // Check if there's time before the first event
      if (new Date(busyPeriods[0].start) > startOfDay) {
        availablePeriods.push({
          start: startOfDay.toISOString(),
          end: busyPeriods[0].start
        });
      }

      // Check gaps between events
      for (let i = 0; i < busyPeriods.length - 1; i++) {
        const currentEnd = new Date(busyPeriods[i].end);
        const nextStart = new Date(busyPeriods[i + 1].start);
        
        if (currentEnd < nextStart) {
          availablePeriods.push({
            start: busyPeriods[i].end,
            end: busyPeriods[i + 1].start
          });
        }
      }

      // Check if there's time after the last event
      const lastEventEnd = new Date(busyPeriods[busyPeriods.length - 1].end);
      if (lastEventEnd < endOfDay) {
        availablePeriods.push({
          start: busyPeriods[busyPeriods.length - 1].end,
          end: endOfDay.toISOString()
        });
      }
    }

    return {
      date: params.date,
      busyPeriods,
      availablePeriods
    };
  }

  private async listCalendars(): Promise<Array<{
    id: string;
    summary: string;
    description?: string;
    primary?: boolean;
    backgroundColor?: string;
  }>> {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list calendars: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }
}