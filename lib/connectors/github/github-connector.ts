/**
 * GitHub Connector
 * Provides capabilities to access repositories, issues, pull requests, and more
 */

import { 
  BaseConnector, 
  ConnectorContext, 
  ConnectorRequest, 
  ConnectorResponse 
} from '../types';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  html_url: string;
  language?: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  pull_request?: any;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  created_at: string;
  updated_at: string;
  merged_at?: string;
  closed_at?: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
}

export class GitHubConnector extends BaseConnector {
  private accessToken?: string;
  private baseUrl = 'https://api.github.com';

  constructor() {
    super({
      id: 'github',
      name: 'GitHub',
      description: 'Access GitHub repositories, issues, pull requests, and more',
      icon: 'github',
      category: 'development',
      capabilities: [
        {
          name: 'listRepos',
          description: 'List repositories for the authenticated user',
          inputSchema: {
            type: 'object',
            properties: {
              visibility: { 
                type: 'string', 
                enum: ['all', 'public', 'private'],
                default: 'all'
              },
              sort: {
                type: 'string',
                enum: ['created', 'updated', 'pushed', 'full_name'],
                default: 'updated'
              },
              per_page: { type: 'number', default: 30 }
            }
          }
        },
        {
          name: 'searchRepos',
          description: 'Search for repositories',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', required: true },
              sort: {
                type: 'string',
                enum: ['stars', 'forks', 'updated'],
                default: 'stars'
              },
              per_page: { type: 'number', default: 30 }
            }
          }
        },
        {
          name: 'getRepoIssues',
          description: 'Get issues for a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', required: true },
              repo: { type: 'string', required: true },
              state: {
                type: 'string',
                enum: ['open', 'closed', 'all'],
                default: 'open'
              },
              labels: { type: 'string' },
              sort: {
                type: 'string',
                enum: ['created', 'updated', 'comments'],
                default: 'created'
              },
              per_page: { type: 'number', default: 30 }
            }
          }
        },
        {
          name: 'getRepoPullRequests',
          description: 'Get pull requests for a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', required: true },
              repo: { type: 'string', required: true },
              state: {
                type: 'string',
                enum: ['open', 'closed', 'all'],
                default: 'open'
              },
              sort: {
                type: 'string',
                enum: ['created', 'updated', 'popularity', 'long-running'],
                default: 'created'
              },
              per_page: { type: 'number', default: 30 }
            }
          }
        },
        {
          name: 'getRepoCommits',
          description: 'Get commits for a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', required: true },
              repo: { type: 'string', required: true },
              sha: { type: 'string' },
              path: { type: 'string' },
              author: { type: 'string' },
              since: { type: 'string', format: 'date-time' },
              until: { type: 'string', format: 'date-time' },
              per_page: { type: 'number', default: 30 }
            }
          }
        },
        {
          name: 'getUserInfo',
          description: 'Get information about a GitHub user',
          inputSchema: {
            type: 'object',
            properties: {
              username: { type: 'string', required: true }
            }
          }
        },
        {
          name: 'searchCode',
          description: 'Search for code across GitHub',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', required: true },
              sort: {
                type: 'string',
                enum: ['indexed'],
                default: 'indexed'
              },
              per_page: { type: 'number', default: 30 }
            }
          }
        },
        {
          name: 'getNotifications',
          description: 'Get notifications for the authenticated user',
          inputSchema: {
            type: 'object',
            properties: {
              all: { type: 'boolean', default: false },
              participating: { type: 'boolean', default: false },
              since: { type: 'string', format: 'date-time' }
            }
          }
        }
      ],
      requiredAuth: {
        type: 'oauth2',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: ['repo', 'user', 'notifications']
      },
      rateLimit: {
        maxRequestsPerMinute: 60,
        maxRequestsPerHour: 5000
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
        throw new Error('Not authenticated. Please connect to GitHub first.');
      }

      let data: any;

      switch (request.capability) {
        case 'listRepos':
          data = await this.listRepos(request.params);
          break;
        
        case 'searchRepos':
          data = await this.searchRepos(request.params);
          break;
        
        case 'getRepoIssues':
          data = await this.getRepoIssues(request.params);
          break;
        
        case 'getRepoPullRequests':
          data = await this.getRepoPullRequests(request.params);
          break;
        
        case 'getRepoCommits':
          data = await this.getRepoCommits(request.params);
          break;
        
        case 'getUserInfo':
          data = await this.getUserInfo(request.params.username);
          break;
        
        case 'searchCode':
          data = await this.searchCode(request.params);
          break;
        
        case 'getNotifications':
          data = await this.getNotifications(request.params);
          break;
        
        default:
          throw new Error(`Unknown capability: ${request.capability}`);
      }

      return {
        success: true,
        data,
        metadata: {
          requestId: `github-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          requestId: `github-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }
      };
    }
  }

  private async makeGitHubRequest(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  private async listRepos(params: any): Promise<GitHubRepo[]> {
    return this.makeGitHubRequest('/user/repos', params);
  }

  private async searchRepos(params: any): Promise<{
    total_count: number;
    items: GitHubRepo[];
  }> {
    const { query, ...otherParams } = params;
    return this.makeGitHubRequest('/search/repositories', {
      q: query,
      ...otherParams
    });
  }

  private async getRepoIssues(params: any): Promise<GitHubIssue[]> {
    const { owner, repo, ...otherParams } = params;
    return this.makeGitHubRequest(`/repos/${owner}/${repo}/issues`, otherParams);
  }

  private async getRepoPullRequests(params: any): Promise<GitHubPullRequest[]> {
    const { owner, repo, ...otherParams } = params;
    return this.makeGitHubRequest(`/repos/${owner}/${repo}/pulls`, otherParams);
  }

  private async getRepoCommits(params: any): Promise<GitHubCommit[]> {
    const { owner, repo, ...otherParams } = params;
    return this.makeGitHubRequest(`/repos/${owner}/${repo}/commits`, otherParams);
  }

  private async getUserInfo(username: string): Promise<{
    login: string;
    name?: string;
    bio?: string;
    company?: string;
    location?: string;
    email?: string;
    blog?: string;
    twitter_username?: string;
    public_repos: number;
    followers: number;
    following: number;
    created_at: string;
    updated_at: string;
  }> {
    return this.makeGitHubRequest(`/users/${username}`);
  }

  private async searchCode(params: any): Promise<{
    total_count: number;
    items: Array<{
      name: string;
      path: string;
      sha: string;
      html_url: string;
      repository: {
        name: string;
        full_name: string;
        owner: {
          login: string;
        };
      };
    }>;
  }> {
    const { query, ...otherParams } = params;
    return this.makeGitHubRequest('/search/code', {
      q: query,
      ...otherParams
    });
  }

  private async getNotifications(params: any): Promise<Array<{
    id: string;
    unread: boolean;
    reason: string;
    updated_at: string;
    repository: {
      name: string;
      full_name: string;
    };
    subject: {
      title: string;
      type: string;
    };
  }>> {
    return this.makeGitHubRequest('/notifications', params);
  }
}