/**
 * Connector System Entry Point
 * Registers all available connectors and provides unified access
 */

import { connectorRegistry } from './registry';
import { GmailConnector } from './gmail/gmail-connector';
import { GoogleCalendarConnector } from './google-calendar/calendar-connector';
import { GoogleMapsConnector } from './google-maps/maps-connector';
import { SlackConnector } from './slack/slack-connector';
import { GitHubConnector } from './github/github-connector';

// Register all connectors
export function initializeConnectors() {
  console.log('Initializing Global Meridian connectors...');
  
  // Communication connectors
  connectorRegistry.register(new GmailConnector());
  connectorRegistry.register(new SlackConnector());
  
  // Productivity connectors
  connectorRegistry.register(new GoogleCalendarConnector());
  
  // Development connectors
  connectorRegistry.register(new GitHubConnector());
  
  // Location connectors
  connectorRegistry.register(new GoogleMapsConnector());
  
  console.log(`Registered ${connectorRegistry.list().length} connectors`);
}

// Export registry and types
export { connectorRegistry } from './registry';
export * from './types';

// Export individual connectors
export { GmailConnector } from './gmail/gmail-connector';
export { GoogleCalendarConnector } from './google-calendar/calendar-connector';
export { GoogleMapsConnector } from './google-maps/maps-connector';
export { SlackConnector } from './slack/slack-connector';
export { GitHubConnector } from './github/github-connector';