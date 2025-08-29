/**
 * Connector Tool for AI Integration
 * Allows AI to use any registered connector
 */

import { CoreTool } from 'ai';
import { z } from 'zod';
import { connectorRegistry } from '@/lib/connectors';
import { StandardizedToolResult, TimelineItemUtils } from './types';

export const connectorTool = {
  description: 'Execute a capability from any connected service (Gmail, Calendar, Maps, Slack, GitHub, etc.)',
  parameters: z.object({
    connectorId: z.string().describe('ID of the connector to use (e.g., gmail, google-calendar, slack)'),
    capability: z.string().describe('Name of the capability to execute'),
    params: z.record(z.any()).describe('Parameters for the capability')
  }),
  execute: async ({ connectorId, capability, params }) => {
    try {
      const connector = connectorRegistry.get(connectorId);
      
      if (!connector) {
        const available = connectorRegistry.list().map(c => c.id).join(', ');
        throw new Error(`Connector ${connectorId} not found. Available: ${available}`);
      }

      // Check if capability exists
      if (!connector.hasCapability(capability)) {
        const available = connector.getCapabilities().map(c => c.name).join(', ');
        throw new Error(`Capability ${capability} not found in ${connectorId}. Available: ${available}`);
      }

      // Execute the connector capability
      const response = await connector.execute({
        capability,
        params,
        auth: {} // In production, this would come from user's stored auth
      });

      if (!response.success) {
        throw new Error(response.error || 'Connector execution failed');
      }

      // Convert to standardized result with timeline items
      const result: StandardizedToolResult = {
        data: response.data,
        timelineItems: createTimelineItems(connectorId, capability, response.data),
        summary: {
          message: `Successfully executed ${capability} on ${connectorId}`,
          itemCount: Array.isArray(response.data) ? response.data.length : 1
        },
        metadata: {
          toolName: 'connector',
          executionTime: response.metadata?.duration
        }
      };

      return result;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          toolName: 'connector'
        }
      };
    }
  }
} as CoreTool;

function createTimelineItems(connectorId: string, capability: string, data: any) {
  const items = [];

  switch (connectorId) {
    case 'gmail':
      if (capability === 'searchEmails' && data.messages) {
        items.push(...data.messages.map((msg: any) => 
          TimelineItemUtils.createGenericItem({
            title: msg.subject,
            description: `From: ${msg.from} | ${msg.snippet}`,
            icon: 'mail',
            metadata: { type: 'email', ...msg }
          })
        ));
      }
      break;

    case 'google-calendar':
      if (Array.isArray(data)) {
        items.push(...data.map((event: any) =>
          TimelineItemUtils.createGenericItem({
            title: event.summary,
            description: `${event.start.dateTime || event.start.date} - ${event.location || 'No location'}`,
            icon: 'calendar',
            metadata: { type: 'calendar-event', ...event }
          })
        ));
      }
      break;

    case 'slack':
      if (capability === 'searchMessages' && data.messages) {
        items.push(...data.messages.map((msg: any) =>
          TimelineItemUtils.createGenericItem({
            title: `Message in #${msg.channel}`,
            description: msg.text,
            icon: 'message-square',
            metadata: { type: 'slack-message', ...msg }
          })
        ));
      }
      break;

    case 'github':
      if (Array.isArray(data)) {
        const itemType = capability.includes('Issue') ? 'issue' : 
                        capability.includes('Pull') ? 'pull-request' : 
                        capability.includes('Commit') ? 'commit' : 'repo';
        
        items.push(...data.map((item: any) =>
          TimelineItemUtils.createGenericItem({
            title: item.title || item.name || item.commit?.message || 'GitHub Item',
            description: item.body || item.description || '',
            icon: 'github',
            metadata: { type: `github-${itemType}`, ...item }
          })
        ));
      }
      break;

    case 'google-maps':
      if (data.routes) {
        items.push(...data.routes.map((route: any) =>
          TimelineItemUtils.createGenericItem({
            title: `Route: ${route.summary}`,
            description: `Distance: ${route.distance.text}, Duration: ${route.duration.text}`,
            icon: 'map-pin',
            metadata: { type: 'directions', ...route }
          })
        ));
      } else if (data.formattedAddress) {
        items.push(TimelineItemUtils.createGenericItem({
          title: data.formattedAddress,
          description: `Location: ${data.location.lat}, ${data.location.lng}`,
          icon: 'map-pin',
          metadata: { type: 'geocode', ...data }
        }));
      }
      break;
  }

  return items;
}

// Helper tool to list available connectors
export const listConnectorsTool = {
  description: 'List all available connectors and their capabilities',
  parameters: z.object({
    category: z.string().optional().describe('Filter by category (productivity, communication, development, analytics, location)')
  }),
  execute: async ({ category }) => {
    const connectors = category 
      ? connectorRegistry.listByCategory(category)
      : connectorRegistry.list();

    const result: StandardizedToolResult = {
      data: connectors,
      timelineItems: connectors.map(connector =>
        TimelineItemUtils.createGenericItem({
          title: connector.name,
          description: `${connector.description} (${connector.capabilities.length} capabilities)`,
          icon: connector.icon,
          metadata: {
            type: 'connector',
            id: connector.id,
            capabilities: connector.capabilities.map(c => c.name)
          }
        })
      ),
      summary: {
        message: `Found ${connectors.length} connectors${category ? ` in category: ${category}` : ''}`,
        itemCount: connectors.length
      },
      metadata: {
        toolName: 'listConnectors'
      }
    };

    return result;
  }
} as CoreTool;