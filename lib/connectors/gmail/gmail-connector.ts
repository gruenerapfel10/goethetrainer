/**
 * Gmail Connector
 * Provides capabilities to read and search Gmail emails
 */

import { 
  BaseConnector, 
  ConnectorContext, 
  ConnectorRequest, 
  ConnectorResponse,
  ConnectorMetadata 
} from '../types';

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  snippet: string;
  body?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
  }>;
  labels?: string[];
}

export interface GmailSearchParams {
  query?: string;
  maxResults?: number;
  labelIds?: string[];
  after?: Date;
  before?: Date;
  from?: string;
  to?: string;
  hasAttachment?: boolean;
}

export class GmailConnector extends BaseConnector {
  private accessToken?: string;
  private refreshToken?: string;

  constructor() {
    super({
      id: 'gmail',
      name: 'Gmail',
      description: 'Connect to Gmail to read emails, search messages, and manage your inbox',
      icon: 'mail',
      category: 'communication',
      capabilities: [
        {
          name: 'searchEmails',
          description: 'Search for emails matching specific criteria',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              maxResults: { type: 'number', default: 10 },
              labelIds: { type: 'array', items: { type: 'string' } },
              after: { type: 'string', format: 'date-time' },
              before: { type: 'string', format: 'date-time' },
              from: { type: 'string' },
              to: { type: 'string' },
              hasAttachment: { type: 'boolean' }
            }
          }
        },
        {
          name: 'getEmail',
          description: 'Get a specific email by ID',
          inputSchema: {
            type: 'object',
            properties: {
              emailId: { type: 'string', required: true }
            }
          }
        },
        {
          name: 'listLabels',
          description: 'List all available Gmail labels',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'getUnreadCount',
          description: 'Get count of unread emails',
          inputSchema: {
            type: 'object',
            properties: {
              labelId: { type: 'string' }
            }
          }
        }
      ],
      requiredAuth: {
        type: 'oauth2',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.labels'
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
    
    // In a real implementation, this would handle OAuth2 flow
    // For now, we'll assume the token is provided in context
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
        throw new Error('Not authenticated. Please connect to Gmail first.');
      }

      let data: any;

      switch (request.capability) {
        case 'searchEmails':
          data = await this.searchEmails(request.params as GmailSearchParams);
          break;
        
        case 'getEmail':
          data = await this.getEmail(request.params.emailId);
          break;
        
        case 'listLabels':
          data = await this.listLabels();
          break;
        
        case 'getUnreadCount':
          data = await this.getUnreadCount(request.params.labelId);
          break;
        
        default:
          throw new Error(`Unknown capability: ${request.capability}`);
      }

      return {
        success: true,
        data,
        metadata: {
          requestId: `gmail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          requestId: `gmail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  private async searchEmails(params: GmailSearchParams): Promise<GmailMessage[]> {
    // Build Gmail search query
    const queryParts: string[] = [];
    
    if (params.query) queryParts.push(params.query);
    if (params.from) queryParts.push(`from:${params.from}`);
    if (params.to) queryParts.push(`to:${params.to}`);
    if (params.after) queryParts.push(`after:${params.after.toISOString().split('T')[0]}`);
    if (params.before) queryParts.push(`before:${params.before.toISOString().split('T')[0]}`);
    if (params.hasAttachment) queryParts.push('has:attachment');
    
    const q = queryParts.join(' ');
    
    // Make API request to Gmail
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=${params.maxResults || 10}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Fetch full message details for each result
    const messages = await Promise.all(
      (data.messages || []).map(async (msg: any) => {
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const messageData = await messageResponse.json();
        return this.parseGmailMessage(messageData);
      })
    );

    return messages;
  }

  private async getEmail(emailId: string): Promise<GmailMessage> {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get email: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseGmailMessage(data);
  }

  private async listLabels(): Promise<Array<{ id: string; name: string; type: string }>> {
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list labels: ${response.statusText}`);
    }

    const data = await response.json();
    return data.labels || [];
  }

  private async getUnreadCount(labelId?: string): Promise<number> {
    const query = labelId ? `is:unread label:${labelId}` : 'is:unread';
    
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get unread count: ${response.statusText}`);
    }

    const data = await response.json();
    return data.resultSizeEstimate || 0;
  }

  private parseGmailMessage(data: any): GmailMessage {
    const headers = data.payload?.headers || [];
    const getHeader = (name: string) => 
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const message: GmailMessage = {
      id: data.id,
      threadId: data.threadId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To').split(',').map((t: string) => t.trim()),
      date: new Date(parseInt(data.internalDate)),
      snippet: data.snippet,
      labels: data.labelIds || []
    };

    // Extract body
    if (data.payload?.body?.data) {
      message.body = Buffer.from(data.payload.body.data, 'base64').toString('utf-8');
    } else if (data.payload?.parts) {
      // Handle multipart messages
      const textPart = data.payload.parts.find((p: any) => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        message.body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    // Extract attachments
    if (data.payload?.parts) {
      message.attachments = data.payload.parts
        .filter((p: any) => p.filename)
        .map((p: any) => ({
          filename: p.filename,
          mimeType: p.mimeType,
          size: parseInt(p.body?.size || '0')
        }));
    }

    return message;
  }
}