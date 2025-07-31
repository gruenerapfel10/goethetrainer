import { BaseConnector } from './types';

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors: Map<string, BaseConnector> = new Map();
  private listeners: Set<(event: ConnectorEvent) => void> = new Set();

  private constructor() {
    // Initialize registry
  }

  static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  registerConnector(id: string, connector: BaseConnector) {
    this.connectors.set(id, connector);
    this.emit({
      type: 'connector-registered',
      connectorId: id,
      timestamp: new Date(),
    });
  }

  unregisterConnector(id: string) {
    this.connectors.delete(id);
    this.emit({
      type: 'connector-unregistered',
      connectorId: id,
      timestamp: new Date(),
    });
  }

  getConnector(id: string): BaseConnector | undefined {
    return this.connectors.get(id);
  }

  getAllConnectors(): BaseConnector[] {
    return Array.from(this.connectors.values());
  }

  getConnectorIds(): string[] {
    return Array.from(this.connectors.keys());
  }

  async executeConnectorMethod(connectorId: string, method: string, params: any): Promise<any> {
    const connector = this.getConnector(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    // Check if method exists on connector
    if (typeof (connector as any)[method] !== 'function') {
      throw new Error(`Method ${method} not found on connector ${connectorId}`);
    }

    try {
      const result = await (connector as any)[method](params);
      
      this.emit({
        type: 'method-executed',
        connectorId,
        method,
        success: true,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      this.emit({
        type: 'method-executed',
        connectorId,
        method,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      
      throw error;
    }
  }

  // Event system
  subscribe(listener: (event: ConnectorEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ConnectorEvent) {
    this.listeners.forEach(listener => listener(event));
  }
}

export interface ConnectorEvent {
  type: 'connector-registered' | 'connector-unregistered' | 'method-executed' | 'status-changed';
  connectorId: string;
  method?: string;
  success?: boolean;
  error?: string;
  timestamp: Date;
  data?: any;
}