// Tool Registry - Central configuration for AI tools
// This file provides a single source of truth for tool metadata used across the application

// Define the structure for tool metadata
export interface ToolMetadata {
  // Display name for the tool in the UI
  displayName: string;
  // Description of what the tool does
  description?: string;
  // Additional metadata specific to this tool
  metadata?: Record<string, any>;
}

// Central registry of all tools and their metadata
export const TOOL_REGISTRY: Record<string, ToolMetadata> = {
  // SharePoint tools
  'sharepoint_reason': {
    displayName: 'Reasoning Engine',
    description: 'Strategically reasons about the user query and orchestrates information gathering'
  },
  'sharepoint_retrieve': {
    displayName: 'Document Retrieval',
    description: 'Retrieves relevant documents from SharePoint knowledge base'
  },
  'sharepoint_retrieve_reranker': {
    displayName: 'Document Reranker',
    description: 'Reranks retrieved documents by relevance'
  },
  'sharepoint_list': {
    displayName: 'Knowledge Base Discovery',
    description: 'Lists available SharePoint knowledge bases'
  },
  'sharepoint_main_agent': {
    displayName: 'Main Agent',
    description: 'Primary SharePoint agent orchestrating the overall process'
  },
  'legacy_sharepoint_agent': {
    displayName: 'Legacy SharePoint Agent',
    description: 'Legacy SharePoint agent implementation'
  },
  
  // CSV tools
  'csv_analyze': {
    displayName: 'CSV Analysis',
    description: 'Analyzes CSV data and provides comprehensive insights'
  },
  'csv_query': {
    displayName: 'CSV Query',
    description: 'Converts natural language to SQL queries for CSV data analysis'
  },
  
  // Chart tools
  'chart': {
    displayName: 'Chart Generation',
    description: 'Creates beautiful, interactive charts and visualizations from data'
  },
  
  // Document tools
  'document': {
    displayName: 'Document',
    description: 'Document or file from the knowledge base'
  },
  
  // Map control tool
  'mapControl': {
    displayName: 'Map Control',
    description: 'Control the interactive globe map - zoom to countries, locations, or change map styles'
  },
  
  // Unknown tool type
  'unknown': {
    displayName: 'Unknown Tool',
    description: 'Unrecognized tool type'
  },
  
  // Add more tools as needed...
};

// Helper function to get tool metadata with fallbacks
export function getToolMetadata(toolName: string): ToolMetadata {
  // Return the registered metadata if it exists
  if (TOOL_REGISTRY[toolName]) {
    return TOOL_REGISTRY[toolName];
  }
  
  // Fallback: generate a display name from the tool name
  const displayName = toolName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
  
  // Return default metadata
  return {
    displayName,
    description: `Tool: ${displayName}`
  };
}

// Helper function to get just the display name
export function getToolDisplayName(toolName: string): string {
  return getToolMetadata(toolName).displayName;
} 