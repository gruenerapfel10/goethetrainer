import { chatModels } from './models';

export interface ModelInfo {
  name: string;
  version?: string;
  description?: string;
}

// Map specific model IDs to standardized names
const modelMap: Record<string, ModelInfo> = {
  'bedrock-sonnet-latest': { name: 'Claude 4 Sonnet' },
  'anthropic.claude-3-5-sonnet-20240620-v1:0': { name: 'Claude 3.5 Sonnet', version: '2024/06' },
  'anthropic.claude-3-haiku-20240307-v1:0': { name: 'Claude 3 Haiku', version: '2024/03' },
  'eu.anthropic.claude-sonnet-4-20250514-v1:0': { name: 'Claude 4 Sonnet', version: '2025/05' },
  'eu.anthropic.claude-3-7-sonnet-20250219-v1:0': { name: 'Claude 3.7 Sonnet', version: '2025/02' },
};

// Map agent types to standardized names
const agentMap: Record<string, ModelInfo> = {
  'general-bedrock-agent': { name: 'Standard Assistant', description: 'Creates emails, reports, and business documents' },
  'sharepoint-agent': { name: 'SharePoint Assistant (v1)', description: 'Finds answers from your business documents' },
  'sharepoint-agent-v2': { name: 'SharePoint Assistant (v2)', description: 'Finds answers from your business documents - Enhanced version' },
  'csv-agent': { name: 'CSV Analysis Assistant (v1)', description: 'Analyzes data from databases and spreadsheets' },
  'csv-agent-v2': { name: 'CSV Analysis Assistant', description: 'Analyzes data from databases and spreadsheets' },
  'text2sql-agent': { name: 'SQL Assistant', description: 'Converts natural language to SQL queries' },
  'document-agent': { name: 'Document Assistant', description: 'Provides info about documents' },
};

export function getModelInfo(modelId: string | null, displayName?: string): ModelInfo {
  // Use displayName if available
  if (displayName) {
    return { name: displayName };
  }

  if (!modelId) {
    return { name: 'Unknown' };
  }

  // Check if we have a direct mapping
  if (modelMap[modelId]) {
    return modelMap[modelId];
  }

  // Extract parts from the model ID
  const parts = modelId.split('-');

  // Default values
  let name = 'Unknown';
  let version = '';

  if (parts.length >= 4) {
    // For IDs like "anthropic.claude-3-5-sonnet-20240620-v1"
    // Find the model name part (usually "sonnet", "haiku", etc.)
    const modelNameIndex = parts.findIndex((part) =>
      ['sonnet', 'haiku', 'opus'].includes(part.toLowerCase()),
    );

    if (modelNameIndex !== -1) {
      const versionParts = parts.slice(0, modelNameIndex + 1);
      
      // Build the name from parts
      if (versionParts.some(p => p.includes('claude'))) {
        const claudeVersions = versionParts.filter(p => p.match(/\d+/));
        const modelType = parts[modelNameIndex];
        
        if (claudeVersions.length > 0) {
          const versionNumber = claudeVersions.join('.');
          name = `Claude ${versionNumber} ${modelType.charAt(0).toUpperCase() + modelType.slice(1)}`;
        } else {
          name = `Claude ${modelType.charAt(0).toUpperCase() + modelType.slice(1)}`;
        }
      }

      // Extract version (date part)
      if (parts.length > modelNameIndex + 1) {
        const dateOrVersion = parts[modelNameIndex + 1];
        if (dateOrVersion.match(/\d{8}/)) {
          const year = dateOrVersion.substring(0, 4);
          const month = dateOrVersion.substring(4, 6);
          version = `${year}/${month}`;
        }
      }
    }
  }

  return { name, version };
}

export function getAgentInfo(agentType: string | null, displayName?: string): ModelInfo {
  // Use displayName if available
  if (displayName) {
    return { name: displayName };
  }

  if (!agentType) {
    return { name: 'Unknown' };
  }

  // Check if we have a direct mapping
  if (agentMap[agentType]) {
    return agentMap[agentType];
  }

  // Format unknown agent types
  return {
    name: agentType
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  };
}

// Helper function to get translated agent info using the translations from models.ts
export function getTranslatedAgentInfo(agentType: string | null, t?: any): ModelInfo {
  if (!agentType) {
    return { name: 'Unknown' };
  }

  const model = chatModels(t).find(m => m.id === agentType);
  if (model) {
    return {
      name: model.name,
      description: model.description
    };
  }

  return getAgentInfo(agentType);
} 