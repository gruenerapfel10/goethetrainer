import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { togetherai } from '@ai-sdk/togetherai';
import { bedrock, createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { customMiddleware } from './custom-middleware';

import { openai } from '@ai-sdk/openai';

export const customModel = (
  apiIdentifier: string,
  forReasoning = false,
) => {
  if (apiIdentifier === 'bedrock-sonnet-latest') {
    // Setup Bedrock provider with inference profile
    const bedrockProvider = createAmazonBedrock({
      region: 'eu-central-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    });

    return wrapLanguageModel({
      model: bedrockProvider('eu.anthropic.claude-sonnet-4-20250514-v1:0'),
      middleware: customMiddleware,
    });
  }

  if (forReasoning) {
    return wrapLanguageModel({
      // @ts-ignore
      model: togetherai(apiIdentifier),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
  }

  return wrapLanguageModel({
    // @ts-ignore
    model: bedrock(apiIdentifier),
    middleware: customMiddleware,
  });
};

export const myProvider = customProvider({
  languageModels: {
    haiku: customModel('anthropic.claude-3-haiku-20240307-v1:0'),
    'general-bedrock-agent': customModel('bedrock-sonnet-latest'),
    'sharepoint-agent': customModel('anthropic.claude-3-sonnet-20240229-v1:0'),
    'sharepoint-agent-v2': customModel('anthropic.claude-3-sonnet-20240229-v1:0'),
    'chat-model-reasoning': customModel('deepseek-ai/DeepSeek-R1', true),
    'deepresearch-model-reasoning': customModel(
      'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
      true,
    ),
    'artifact-model': customModel('bedrock-sonnet-latest'),
    'bedrock-sonnet-latest': customModel('bedrock-sonnet-latest'),
    'document-agent': customModel('bedrock-sonnet-latest'),
    'csv-agent': customModel('bedrock-sonnet-latest'),
    'csv-agent-v2': customModel('bedrock-sonnet-latest'),
    'text2sql-agent': customModel('bedrock-sonnet-latest'),
  },
  imageModels: {
    'gpt-image-1': openai.image('gpt-image-1'),
  },
});

// Define the chat model type
export interface ChatModel {
  id: string;
  name: string;
  description: string;
  icon: string; // Icon name to be used in the UI
}

export const chatModels: (t?: any) => Array<ChatModel> = (t?) =>
  [
    {
      id: 'general-bedrock-agent',
      name: t ? t('agents.standard.label') : '',
      description: t ? t('agents.standard.description') : '',
      icon: 'sparkles', // SparklesIcon for AI/general purpose
    },
    {
      id: 'sharepoint-agent',
      name: t ? `${t('agents.sharepoint.label')} (v1)` : '',
      description: t ? t('agents.sharepoint.description') : '',
      icon: 'box', // BoxIcon for document storage/knowledge base
    },
    {
      id: 'sharepoint-agent-v2',
      name: t ? `${t('agents.sharepoint.label')} (v2)` : '',
      description: t ? `${t('agents.sharepoint.description')} - Enhanced version` : '',
      icon: 'box', // BoxIcon for document storage/knowledge base
    },
    // {
    //    id: 'chat-model-reasoning',
    //    name: t ? t('agents.reasoning.label') : '',
    //    description: t ? t('agents.reasoning.description') : '',
    //    icon: 'code', // CodeIcon for reasoning/logic
    //  },
    //  {
    //    id: 'document-agent',
    //    name: t ? t('agents.document.label') : '',
    //    description: 'Provides info about documents',
    //    icon: 'file', // FileIcon for document agent
    //  },
    // {
    //   id: 'csv-agent',
    //   name: t ? t('agents.csv.label') + ' (v1)' : 'CSV Analysis Assistant (v1)',
    //   description: t
    //     ? t('agents.csv.description')
    //     : 'Analyzes CSV data and provides insights',
    //   icon: 'table', // More appropriate for data/CSV
    // },
    // {
    //   id: 'csv-agent-v2',
      // name: t ? t('agents.csv.label') + ' (v2)' : 'CSV Analysis Assistant (v2)',
    //  name: t ? t('agents.csv.label'): 'CSV Analysis Assistant',
    //  description: t
        // ? t('agents.csv.description') + ' Enhanced version with improved reasoning and structured analysis.'
    //    ? t('agents.csv.description')
        // : 'Analyzes CSV data and provides insights with enhanced reasoning and structured analysis.',
       // : 'Analyzes CSV data and provides insights.',
     // icon: 'lineChart', // LineChartIcon for data analysis
    //},
     //   : 'Analyzes CSV data and provides insights.',
   // },
    {
      id: 'text2sql-agent',
      name: t ? t('agents.text2sql.label') : '',
      description: t ? t('agents.text2sql.description') : '',
      icon: 'lineChart'
    },
  ] as const;

export const DEFAULT_MODEL_NAME: string = 'general-bedrock-agent';
