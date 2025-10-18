import type { ToolName } from '@/lib/ai/tools/tool-registry';
import type { FeatureName } from '@/lib/ai/features/feature-registry';

// Agent type enum
export enum AgentType {
  GENERAL_AGENT = 'general-bedrock-agent',
  TEXT2SQL_AGENT = 'text2sql-agent',
}

// Suggested action interface
export interface SuggestedAction {
  title: string;
  label: string;
  action: string;
  // Translation keys for i18n (optional - fallback to title/label/action if not provided)
  titleKey?: string;
  labelKey?: string;
  actionKey?: string;
}

// Agent configuration interface
export interface AgentConfig {
  // Agent type identifier
  agentType: 'general-bedrock-agent' | 'text2sql-agent';
  // Agent metadata
  metadata: {
    displayName: string;
    description: string;
    // Translation keys for i18n (optional - fallback to displayName/description if not provided)
    displayNameKey?: string;
    descriptionKey?: string;
    icon: string;
    modelId: string; // The actual model ID used by this agent
  };
  tools: ToolName[]; // All tools for this agent
  features: FeatureName[]; // User-facing UI features
  supportsFileAttachments: boolean; // Whether this agent supports file attachments
  suggestedActions: SuggestedAction[]; // Suggested actions for this agent
  model: {
    contextWindow: number;
    temperature: number;
    maxSteps: number;
    toolChoice: 'auto' | 'none' | 'required';
    streamOptions?: {
      chunking?: 'word' | 'line';
      delayInMs?: number;
    };
  };
  prompt: string;
  getPromptWithTables?: (tables?: any[]) => string;
}