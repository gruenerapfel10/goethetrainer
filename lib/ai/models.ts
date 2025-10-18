import { customProvider } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { AgentType } from '@/lib/ai/agents';
import { ModelId } from '@/lib/ai/model-registry';
import { getAgentMetadata } from '@/lib/ai/agents';

export const customModel = (modelId: ModelId | string) => {
  return anthropic(modelId);
};

export const myProvider = customProvider({
  languageModels: {
    'grok-4-fast-reasoning': customModel(ModelId.CLAUDE_HAIKU_4_5),
    'artifact-model': customModel(ModelId.CLAUDE_HAIKU_4_5),
    'bedrock-sonnet-latest': customModel(ModelId.CLAUDE_HAIKU_4_5),
    'document-agent': customModel(ModelId.CLAUDE_HAIKU_4_5),
    
    [AgentType.GENERAL_AGENT]: customModel(ModelId.CLAUDE_HAIKU_4_5),
    [AgentType.GOETHE_AGENT]: customModel(ModelId.CLAUDE_SONNET_4_5),
  },
  imageModels: {
    'gpt-image-1': openai.image('gpt-image-1'),
  },
});

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const chatModels: (t?: any) => Array<ChatModel> = (t?) => {
  const models: ChatModel[] = [];
  
  const goetheMeta = getAgentMetadata(AgentType.GOETHE_AGENT);
  models.push({
    id: AgentType.GOETHE_AGENT,
    name: (t && goetheMeta.displayNameKey) ? t(goetheMeta.displayNameKey) : goetheMeta.displayName,
    description: (t && goetheMeta.descriptionKey) ? t(goetheMeta.descriptionKey) : goetheMeta.description,
    icon: goetheMeta.icon,
  });
  
  const generalMeta = getAgentMetadata(AgentType.GENERAL_AGENT);
  models.push({
    id: AgentType.GENERAL_AGENT,
    name: (t && generalMeta.displayNameKey) ? t(generalMeta.displayNameKey) : generalMeta.displayName,
    description: (t && generalMeta.descriptionKey) ? t(generalMeta.descriptionKey) : generalMeta.description,
    icon: generalMeta.icon,
  });
  
  return models;
};

export const DEFAULT_MODEL_NAME: string = AgentType.GOETHE_AGENT;
