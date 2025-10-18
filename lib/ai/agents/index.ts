import { generalAgentConfig } from './general-agent.config';
import { AgentType, AgentConfig, SuggestedAction } from './types';
import type { ToolName } from '@/lib/ai/tools/tool-registry';
import type { FeatureName } from '@/lib/ai/features/feature-registry';

// Re-export types
export { AgentType, type AgentConfig, type SuggestedAction } from './types';

// Map of all agent configurations
export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  [AgentType.GENERAL_AGENT]: generalAgentConfig,
};


// Map model IDs to agent types
export const MODEL_TO_AGENT_TYPE: Record<string, AgentType> = {
  'general-bedrock-agent': AgentType.GENERAL_AGENT,
};

// Get agent configuration
export function getAgentConfig(agentType: AgentType): AgentConfig {
  const config = AGENT_CONFIGS[agentType];
  if (!config) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }
  return config;
}

// Get agent type from model ID
export function getAgentTypeFromModel(modelId: string): AgentType {
  return MODEL_TO_AGENT_TYPE[modelId] || AgentType.GENERAL_AGENT;
}

// Get all tools for an agent (filtered by enabled state)
export function getAgentTools(
  agentType: AgentType,
  toolStates?: Record<string, boolean>
): ToolName[] {
  const config = getAgentConfig(agentType);
  const { TOOL_METADATA } = require('@/lib/ai/tools/tool-registry');
  
  const tools = config.tools.filter(toolName => {
    const metadata = TOOL_METADATA[toolName];
    // If tool is not toggleable, always include it
    if (!metadata?.toggle) return true;
    // If tool is toggleable, check the state value directly (it's a boolean, not an object)
    const activeValue = toolStates?.[toolName];
    const isActive = activeValue !== false;
    console.log(`[getAgentTools] ${toolName}: toggle=${metadata.toggle}, activeValue=${activeValue}, include=${isActive}`);
    return isActive;
  });
  
  return tools;
}

// Get agent features (user-facing UI features)
export function getAgentFeatures(agentType: AgentType): FeatureName[] {
  const config = getAgentConfig(agentType);
  return config.features;
}

// Get agent metadata (display name, description, icon, model ID)
export function getAgentMetadata(agentType: AgentType) {
  const config = getAgentConfig(agentType);
  return config.metadata;
}

// Get agent display name
export function getAgentDisplayName(agentType: AgentType): string {
  const config = getAgentConfig(agentType);
  return config.metadata.displayName;
}

// Get agent model ID
export function getAgentModelId(agentType: AgentType): string {
  const config = getAgentConfig(agentType);
  return config.metadata.modelId;
}

// Get agent suggested actions
export function getAgentSuggestedActions(agentType: AgentType): SuggestedAction[] {
  const config = getAgentConfig(agentType);
  return config.suggestedActions;
}

// Get agent file attachments support
export function getAgentSupportsFileAttachments(agentType: AgentType): boolean {
  const config = getAgentConfig(agentType);
  return config.supportsFileAttachments ?? true;
}

export const AGENT_TO_ASSISTANT: Record<string, string> = {
  [AgentType.GENERAL_AGENT]: 'general-assistant',
};

// Get agent prompt
export function getAgentPrompt(
  agentType: AgentType,
  options?: {
    availableTables?: any[];
    customPrompt?: string;
    [key: string]: any; // Accept any dynamic tool/feature options
  }
): string {
  const config = getAgentConfig(agentType);
  
  // Use custom prompt builder if available (e.g., for CSV agent)
  if (config.getPromptWithTables && options?.availableTables) {
    return config.getPromptWithTables(options.availableTables);
  }
  
  // Use custom prompt if provided, otherwise use config prompt
  let prompt = options?.customPrompt || config.prompt;
  
  // Get the actual tools that are available
  const tools = getAgentTools(agentType, options);
  const { TOOL_METADATA } = require('@/lib/ai/tools/tool-registry');
  
  // Build list of available tools
  const availableToolsList = [];
  
  // Add all enabled tools
  for (const toolName of tools) {
    const metadata = TOOL_METADATA[toolName];
    if (metadata) {
      availableToolsList.push(`- ${toolName}: ${metadata.description}`);
    }
  }
  
  // Add available tools list to prompt
  if (availableToolsList.length > 0) {
    prompt += `\n\n====== CURRENTLY AVAILABLE TOOLS ======\nYou are currently operating as the ${agentType} agent with access to the following tools:\n${availableToolsList.join('\n')}\n\n⚠️ CRITICAL: You may ONLY use the tools listed above. Any tool not listed here is NOT available to you.`;
  }
  
  // Add capability status for toggleable tools
  const capabilityStatus = [];
  for (const toolName of config.tools) {
    const metadata = TOOL_METADATA[toolName];
    if (metadata?.toggle) {
      const isEnabled = options?.[toolName] ?? false;
      capabilityStatus.push(`${metadata.displayName}: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
    }
  }
  
  if (capabilityStatus.length > 0) {
    prompt += `\n\nCAPABILITY STATUS:\n${capabilityStatus.join('\n')}\n\n⚠️ IMPORTANT: Only use the tools listed above. If a user requests something requiring a disabled feature or an unavailable tool, politely explain that it's not available in the current agent configuration.`;
  }
  
  return prompt;
}