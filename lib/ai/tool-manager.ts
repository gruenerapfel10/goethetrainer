/**
 * Centralized tool management system
 * Maps agent configurations to their available tools based on feature toggles
 */

import { getAgentConfig, getAgentTypeFromModel } from './agents';
import { type ToolName, TOOL_METADATA } from './tools/tool-registry';

/**
 * Get which tools are toggleable for a specific model
 */
export function getModelToggleTools(modelId: string): ToolName[] {
  const agentType = getAgentTypeFromModel(modelId);
  const config = getAgentConfig(agentType);
  
  // Return only tools that have toggle: true
  return config.tools.filter(toolName => {
    const metadata = TOOL_METADATA[toolName];
    return metadata?.toggle === true;
  });
}

/**
 * Check if a model supports a specific toggleable tool
 */
export function supportsToggleTool(modelId: string, toolName: string): boolean {
  const toggleTools = getModelToggleTools(modelId);
  return toggleTools.includes(toolName as ToolName);
}

/**
 * Get all active tools for a model based on enabled features
 */
export function getActiveToolsForModel(
  modelId: string,
  enabledTools: Record<string, boolean>
): ToolName[] {
  const agentType = getAgentTypeFromModel(modelId);
  const config = getAgentConfig(agentType);
  
  // Filter tools based on their toggle state
  const activeTools: ToolName[] = [];
  
  // Add tools based on toggle state
  config.tools.forEach(toolName => {
    const metadata = TOOL_METADATA[toolName];
    if (!metadata) return;
    
    // If not toggleable, always add it
    if (!metadata.toggle) {
      activeTools.push(toolName);
    } else {
      // If toggleable, check if it's enabled
      if (enabledTools[toolName]) {
        activeTools.push(toolName);
      }
    }
  });
  
  return activeTools;
}

/**
 * Normalize feature state to handle replacements
 */
export function normalizeFeatureState(
  modelId: string,
  features: {
    webSearch?: boolean;
    deepResearch?: boolean;
    imageGeneration?: boolean;
    fileSearch?: boolean;
  }
): typeof features {
  const normalized = { ...features };
  
  // If deep research is enabled, disable web search
  if (normalized.deepResearch) {
    normalized.webSearch = false;
  }
  
  return normalized;
}

/**
 * Legacy compatibility - maps old capability names to feature IDs
 */
export function mapLegacyCapabilityToFeature(capability: string): string | null {
  const mapping: Record<string, string> = {
    'deepSearch': 'deepResearch',
    'webSearch': 'webSearch',
    'imageGeneration': 'imageGeneration',
    'fileSearch': 'fileSearch',
  };
  
  return mapping[capability] || null;
}

/**
 * Get display info for all toggleable features
 */
export function getToggleFeaturesDisplay(): Array<{
  id: string;
  label: string;
  icon: string;
}> {
  return [
    { id: 'deepResearch', label: 'Deep Research', icon: 'lightbulb' },
    { id: 'webSearch', label: 'Web Search', icon: 'globe' },
    { id: 'imageGeneration', label: 'Image Generation', icon: 'image' },
    { id: 'fileSearch', label: 'File Search', icon: 'file' },
  ];
}