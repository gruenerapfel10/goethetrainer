/**
 * Slack Connector
 * Provides capabilities to read messages, channels, and user information from Slack
 */

import { 
  BaseConnector, 
  ConnectorContext, 
  ConnectorRequest, 
  ConnectorResponse 
} from '../types';

export interface SlackMessage {
  ts: string;
  user: string;
  username?: string;
  text: string;
  channel: string;
  thread_ts?: string;
  attachments?: any[];
  reactions?: Array<{
    name: string;
    users: string[];
    count: number;
  }>;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_member: boolean;
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
  num_members?: number;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  display_name?: string;
  email?: string;
  is_admin?: boolean;
  is_bot?: boolean;
  status_text?: string;
  status_emoji?: string;
  profile?: {
    avatar_hash?: string;
    image_original?: string;
    title?: string;
    phone?: string;
  };
}

export class SlackConnector extends BaseConnector {
  private accessToken?: string;

  constructor() {
    super({
      id: 'slack',
      name: 'Slack',
      description: 'Connect to Slack to read messages, search conversations, and access workspace information',
      icon: 'message-square',
      category: 'communication',
      capabilities: [
        {
          name: 'searchMessages',
          description: 'Search for messages across the workspace',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', required: true },
              count: { type: 'number', default: 20 },
              sort: { 
                type: 'string', 
                enum: ['score', 'timestamp'],
                default: 'score'
              }
            }
          }
        },
        {
          name: 'getChannelMessages',
          description: 'Get messages from a specific channel',
          inputSchema: {
            type: 'object',
            properties: {
              channel: { type: 'string', required: true },
              limit: { type: 'number', default: 100 },
              oldest: { type: 'string' },
              latest: { type: 'string' }
            }
          }
        },
        {
          name: 'listChannels',
          description: 'List all channels in the workspace',
          inputSchema: {
            type: 'object',
            properties: {
              types: { 
                type: 'string', 
                default: 'public_channel,private_channel'
              },
              limit: { type: 'number', default: 100 }
            }
          }
        },
        {
          name: 'getUserInfo',
          description: 'Get information about a specific user',
          inputSchema: {
            type: 'object',
            properties: {
              user: { type: 'string', required: true }
            }
          }
        },
        {
          name: 'getDirectMessages',
          description: 'Get direct messages with a specific user',
          inputSchema: {
            type: 'object',
            properties: {
              user: { type: 'string', required: true },
              limit: { type: 'number', default: 100 }
            }
          }
        },
        {
          name: 'getThreadMessages',
          description: 'Get messages from a specific thread',
          inputSchema: {
            type: 'object',
            properties: {
              channel: { type: 'string', required: true },
              thread_ts: { type: 'string', required: true }
            }
          }
        },
        {
          name: 'searchUsers',
          description: 'Search for users in the workspace',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', required: true }
            }
          }
        }
      ],
      requiredAuth: {
        type: 'oauth2',
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scopes: [
          'channels:history',
          'channels:read',
          'groups:history',
          'groups:read',
          'im:history',
          'im:read',
          'mpim:history',
          'mpim:read',
          'search:read',
          'users:read',
          'users:read.email'
        ]
      },
      rateLimit: {
        maxRequestsPerMinute: 50,
        maxRequestsPerHour: 1000
      }
    });
  }

  async connect(context: ConnectorContext): Promise<void> {
    this.context = context;
    
    if (context.auth?.accessToken) {
      this.accessToken = context.auth.accessToken;
    }
  }

  async disconnect(): Promise<void> {
    this.accessToken = undefined;
    this.context = undefined;
  }

  async execute(request: ConnectorRequest): Promise<ConnectorResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated. Please connect to Slack first.');
      }

      let data: any;

      switch (request.capability) {
        case 'searchMessages':
          data = await this.searchMessages({
            query: request.params.query || '',
            count: request.params.count,
            sort: request.params.sort
          });
          break;
        
        case 'getChannelMessages':
          data = await this.getChannelMessages({
            channel: request.params.channel || '',
            limit: request.params.limit,
            latest: request.params.latest,
            oldest: request.params.oldest
          });
          break;
        
        case 'listChannels':
          data = await this.listChannels({
            types: request.params.types || ['public_channel'],
            limit: request.params.limit
          });
          break;
        
        case 'getUserInfo':
          data = await this.getUserInfo(request.params.user);
          break;
        
        case 'getDirectMessages':
          data = await this.getDirectMessages({
            user: request.params.user || '',
            limit: request.params.limit
          });
          break;
        
        case 'getThreadMessages':
          data = await this.getThreadMessages({
            channel: request.params.channel || '',
            thread_ts: request.params.thread_ts || ''
          });
          break;
        
        case 'searchUsers':
          data = await this.searchUsers(request.params.query);
          break;
        
        default:
          throw new Error(`Unknown capability: ${request.capability}`);
      }

      return {
        success: true,
        data,
        metadata: {
          requestId: `slack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          requestId: `slack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  private async makeSlackRequest(method: string, params?: any): Promise<any> {
    const url = new URL(`https://slack.com/api/${method}`);
    
    if (params) {
      Object.keys(params).forEach(key => 
        url.searchParams.append(key, params[key])
      );
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  private async searchMessages(params: {
    query: string;
    count?: number;
    sort?: string;
  }): Promise<{
    messages: SlackMessage[];
    total: number;
  }> {
    const data = await this.makeSlackRequest('search.messages', {
      query: params.query,
      count: params.count || 20,
      sort: params.sort || 'score'
    });

    return {
      messages: data.messages?.matches || [],
      total: data.messages?.total || 0
    };
  }

  private async getChannelMessages(params: {
    channel: string;
    limit?: number;
    oldest?: string;
    latest?: string;
  }): Promise<SlackMessage[]> {
    const data = await this.makeSlackRequest('conversations.history', {
      channel: params.channel,
      limit: params.limit || 100,
      ...(params.oldest && { oldest: params.oldest }),
      ...(params.latest && { latest: params.latest })
    });

    return data.messages || [];
  }

  private async listChannels(params: {
    types?: string;
    limit?: number;
  }): Promise<SlackChannel[]> {
    const data = await this.makeSlackRequest('conversations.list', {
      types: params.types || 'public_channel,private_channel',
      limit: params.limit || 100
    });

    return data.channels || [];
  }

  private async getUserInfo(userId: string): Promise<SlackUser> {
    const data = await this.makeSlackRequest('users.info', {
      user: userId
    });

    return data.user;
  }

  private async getDirectMessages(params: {
    user: string;
    limit?: number;
  }): Promise<SlackMessage[]> {
    // First, find the DM channel with this user
    const imData = await this.makeSlackRequest('conversations.list', {
      types: 'im',
      limit: 1000
    });

    const dmChannel = imData.channels?.find((channel: any) => 
      channel.user === params.user
    );

    if (!dmChannel) {
      throw new Error(`No direct message channel found with user ${params.user}`);
    }

    // Get messages from the DM channel
    return this.getChannelMessages({
      channel: dmChannel.id,
      limit: params.limit
    });
  }

  private async getThreadMessages(params: {
    channel: string;
    thread_ts: string;
  }): Promise<SlackMessage[]> {
    const data = await this.makeSlackRequest('conversations.replies', {
      channel: params.channel,
      ts: params.thread_ts
    });

    return data.messages || [];
  }

  private async searchUsers(query: string): Promise<SlackUser[]> {
    // Get all users and filter locally
    // Slack doesn't have a direct user search API
    const data = await this.makeSlackRequest('users.list', {
      limit: 1000
    });

    const users = data.members || [];
    const lowerQuery = query.toLowerCase();

    return users.filter((user: SlackUser) => 
      user.name?.toLowerCase().includes(lowerQuery) ||
      user.real_name?.toLowerCase().includes(lowerQuery) ||
      user.display_name?.toLowerCase().includes(lowerQuery) ||
      user.email?.toLowerCase().includes(lowerQuery)
    );
  }
}