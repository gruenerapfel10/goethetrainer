import { customProvider } from 'ai';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { AgentType } from '@/lib/ai/agents';
import { ModelId } from '@/lib/ai/model-registry';

const bedrockProvider = createAmazonBedrock({
  region: 'eu-central-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
});

export const customModel = (modelId: ModelId | string) => {
  if (modelId === ModelId.GROK_4 || modelId === 'grok-4-fast-reasoning') {
    return xai(modelId);
  }
  return bedrockProvider(modelId);
};

export const myProvider = customProvider({
  languageModels: {
    'haiku': customModel(ModelId.CLAUDE_HAIKU_3),
    'artifact-model': customModel(ModelId.GROK_4),
    'bedrock-sonnet-latest': customModel(ModelId.GROK_4),
    'document-agent': customModel(ModelId.GROK_4),
    
    [AgentType.GENERAL_AGENT]: customModel(ModelId.GROK_4),
    [AgentType.SHAREPOINT_AGENT]: customModel(ModelId.GROK_4),
    [AgentType.TEXT2SQL_AGENT]: customModel(ModelId.GROK_4),
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

import { getAgentMetadata } from '@/lib/ai/agents';

export const chatModels: (t?: any) => Array<ChatModel> = (t?) => {
  const models: ChatModel[] = [];
  
  const generalMeta = getAgentMetadata(AgentType.GENERAL_AGENT);
  models.push({
    id: AgentType.GENERAL_AGENT,
    name: (t && generalMeta.displayNameKey) ? t(generalMeta.displayNameKey) : generalMeta.displayName,
    description: (t && generalMeta.descriptionKey) ? t(generalMeta.descriptionKey) : generalMeta.description,
    icon: generalMeta.icon,
  });
  
  const sharepointMeta = getAgentMetadata(AgentType.SHAREPOINT_AGENT);
  models.push({
    id: AgentType.SHAREPOINT_AGENT,
    name: (t && sharepointMeta.displayNameKey) ? t(sharepointMeta.displayNameKey) : sharepointMeta.displayName,
    description: (t && sharepointMeta.descriptionKey) ? t(sharepointMeta.descriptionKey) : sharepointMeta.description,
    icon: sharepointMeta.icon,
  });
  
  const text2sqlMeta = getAgentMetadata(AgentType.TEXT2SQL_AGENT);
  models.push({
    id: AgentType.TEXT2SQL_AGENT,
    name: (t && text2sqlMeta.displayNameKey) ? t(text2sqlMeta.displayNameKey) : text2sqlMeta.displayName,
    description: (t && text2sqlMeta.descriptionKey) ? t(text2sqlMeta.descriptionKey) : text2sqlMeta.description,
    icon: text2sqlMeta.icon,
  });
  
  return models;
};

export const DEFAULT_MODEL_NAME: string = AgentType.GENERAL_AGENT;
