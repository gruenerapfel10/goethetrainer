import { customProvider } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { AgentType } from '@/lib/ai/agents';
import { ModelId } from '@/lib/ai/model-registry';
import { getAgentMetadata } from '@/lib/ai/agents';

export const customModel = (modelId: ModelId | string) => {
  // Use Vercel AI Gateway for Z.ai models, Anthropic for Claude
  if (modelId === ModelId.GLM_4_5_AIR || typeof modelId === 'string' && modelId.startsWith('zai/')) {
    // Vercel AI Gateway automatically routes z.ai models through its gateway
    return openai(modelId);
  }
  return anthropic(modelId);
};

export const myProvider = customProvider({
  languageModels: {
    'grok-4-fast-reasoning': customModel(ModelId.GLM_4_5_AIR),
    'artifact-model': customModel(ModelId.GLM_4_5_AIR),
    'bedrock-sonnet-latest': customModel(ModelId.GLM_4_5_AIR),
    'document-agent': customModel(ModelId.GLM_4_5_AIR),

    [AgentType.GENERAL_AGENT]: customModel(ModelId.GLM_4_5_AIR),
    [AgentType.GOETHE_AGENT]: customModel(ModelId.GLM_4_5_AIR),
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
