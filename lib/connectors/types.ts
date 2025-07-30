/**
 * Connector Infrastructure Types
 * Based on Model Context Protocol (MCP) architecture
 */

export interface ConnectorCapability {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface ConnectorMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'productivity' | 'communication' | 'development' | 'analytics' | 'location';
  capabilities: ConnectorCapability[];
  requiredAuth?: AuthConfig;
  rateLimit?: RateLimitConfig;
}

export interface AuthConfig {
  type: 'oauth2' | 'api_key' | 'bearer_token' | 'basic';
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  clientId?: string;
  clientSecret?: string;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour?: number;
  maxRequestsPerDay?: number;
}

export interface ConnectorRequest {
  capability: string;
  params: Record<string, any>;
  auth?: any;
}

export interface ConnectorResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    requestId: string;
    timestamp: number;
    duration: number;
    rateLimitRemaining?: number;
  };
}

export interface ConnectorContext {
  userId: string;
  sessionId: string;
  auth?: any;
  metadata?: Record<string, any>;
}

export abstract class BaseConnector {
  protected metadata: ConnectorMetadata;
  protected context?: ConnectorContext;

  constructor(metadata: ConnectorMetadata) {
    this.metadata = metadata;
  }

  abstract connect(context: ConnectorContext): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract execute(request: ConnectorRequest): Promise<ConnectorResponse>;
  
  getMetadata(): ConnectorMetadata {
    return this.metadata;
  }

  getCapabilities(): ConnectorCapability[] {
    return this.metadata.capabilities;
  }

  hasCapability(name: string): boolean {
    return this.metadata.capabilities.some(cap => cap.name === name);
  }
}

export interface ConnectorRegistry {
  register(connector: BaseConnector): void;
  unregister(connectorId: string): void;
  get(connectorId: string): BaseConnector | undefined;
  list(): ConnectorMetadata[];
  listByCategory(category: string): ConnectorMetadata[];
}