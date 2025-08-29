/**
 * Connector Registry Implementation
 * Manages all available connectors in the system
 */

import { BaseConnector, ConnectorMetadata, ConnectorRegistry } from './types';

class ConnectorRegistryImpl implements ConnectorRegistry {
  private connectors: Map<string, BaseConnector> = new Map();

  register(connector: BaseConnector): void {
    const metadata = connector.getMetadata();
    if (this.connectors.has(metadata.id)) {
      throw new Error(`Connector with id ${metadata.id} already registered`);
    }
    this.connectors.set(metadata.id, connector);
    console.log(`Registered connector: ${metadata.name} (${metadata.id})`);
  }

  unregister(connectorId: string): void {
    if (!this.connectors.has(connectorId)) {
      throw new Error(`Connector with id ${connectorId} not found`);
    }
    this.connectors.delete(connectorId);
    console.log(`Unregistered connector: ${connectorId}`);
  }

  get(connectorId: string): BaseConnector | undefined {
    return this.connectors.get(connectorId);
  }

  list(): ConnectorMetadata[] {
    return Array.from(this.connectors.values()).map(connector => 
      connector.getMetadata()
    );
  }

  listByCategory(category: string): ConnectorMetadata[] {
    return this.list().filter(metadata => 
      metadata.category === category
    );
  }

  // Helper method to get all unique categories
  getCategories(): string[] {
    const categories = new Set<string>();
    this.list().forEach(metadata => {
      categories.add(metadata.category);
    });
    return Array.from(categories);
  }

  // Helper method to search connectors
  search(query: string): ConnectorMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter(metadata => 
      metadata.name.toLowerCase().includes(lowerQuery) ||
      metadata.description.toLowerCase().includes(lowerQuery) ||
      metadata.capabilities.some(cap => 
        cap.name.toLowerCase().includes(lowerQuery) ||
        cap.description.toLowerCase().includes(lowerQuery)
      )
    );
  }
}

// Singleton instance
export const connectorRegistry = new ConnectorRegistryImpl();