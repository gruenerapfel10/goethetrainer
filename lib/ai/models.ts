import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { togetherai } from '@ai-sdk/togetherai';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { customMiddleware } from './custom-middleware';

import { openai } from '@ai-sdk/openai';

export const customModel = (
  apiIdentifier: string,
  forReasoning = false,
) => {
  // Handle Gemini models
  if (apiIdentifier.includes('gemini')) {
    return wrapLanguageModel({
      model: google(apiIdentifier),
      middleware: customMiddleware,
    });
  }

  // Handle xAI Grok models - no middleware to avoid stream-start issues
  if (apiIdentifier.includes('grok')) {
    return xai(apiIdentifier);
  }

  if (forReasoning) {
    return wrapLanguageModel({
      // @ts-ignore
      model: togetherai(apiIdentifier),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
  }

  // Default fallback to Gemini 2.5 Flash for any legacy models
  return wrapLanguageModel({
    model: google('gemini-2.5-flash'),
    middleware: customMiddleware,
  });
};

export const myProvider = customProvider({
  languageModels: {
    // Main Gemini models
    'gemini-2.5-flash': customModel('gemini-2.5-flash'),
    'gemini-2.0-flash-latest': customModel('gemini-2.5-flash'), // Map old model to new
    'gemini-2.5-pro': customModel('gemini-2.5-pro'),
    
    // xAI Grok models
    'grok-4-fast-non-reasoning': customModel('grok-4-fast-non-reasoning'),
    'grok-4-fast-reasoning': customModel('grok-4-fast-reasoning'),
    'grok-4': customModel('grok-4'),
    'grok-3': customModel('grok-3'),
    'grok-3-latest': customModel('grok-3-latest'),
    'grok-beta': customModel('grok-beta'),
    
    // Legacy model mappings - now using Gemini
    'haiku': customModel('gemini-2.5-flash'), // Legacy Bedrock Haiku -> Gemini
    'bedrock-sonnet-latest': customModel('gemini-2.5-flash'), // Legacy Bedrock Sonnet -> Gemini
    'artifacts-model': customModel('gemini-2.5-flash'), // Typo variant of artifact-model
    
    // Legacy agent mappings - now using Gemini
    'general-bedrock-agent': customModel('gemini-2.5-flash'),
    'sharepoint-agent': customModel('gemini-2.5-flash'),
    'sharepoint-agent-v2': customModel('gemini-2.5-flash'),
    'document-agent': customModel('gemini-2.5-flash'),
    'csv-agent': customModel('gemini-2.5-flash'),
    'csv-agent-v2': customModel('gemini-2.5-flash'),
    'text2sql-agent': customModel('gemini-2.5-flash'),
    'artifact-model': customModel('gemini-2.5-flash'),
    
    // Reasoning models (keep TogetherAI for now)
    'chat-model-reasoning': customModel('deepseek-ai/DeepSeek-R1', true),
    'deepresearch-model-reasoning': customModel(
      'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
      true,
    ),
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
      name: t ? t('agents.standard.label') : 'General Assistant',
      description: t ? t('agents.standard.description') : 'Powered by Google Gemini 2.5 Flash',
      icon: 'sparkles', // SparklesIcon for AI/general purpose
    },
    {
      id: 'sharepoint-agent',
      name: t ? `${t('agents.sharepoint.label')} (v1)` : 'SharePoint Assistant (v1)',
      description: t ? t('agents.sharepoint.description') : 'Document analysis and search',
      icon: 'box', // BoxIcon for document storage/knowledge base
    },
    {
      id: 'sharepoint-agent-v2',
      name: t ? `${t('agents.sharepoint.label')} (v2)` : 'SharePoint Assistant (v2)', 
      description: t ? `${t('agents.sharepoint.description')} - Enhanced version` : 'Enhanced document analysis and search',
      icon: 'box', // BoxIcon for document storage/knowledge base
    },
    {
      id: 'text2sql-agent',
      name: t ? t('agents.text2sql.label') : 'SQL Assistant',
      description: t ? t('agents.text2sql.description') : 'Natural language to SQL queries',
      icon: 'lineChart'
    },
  ] as const;

export const DEFAULT_MODEL_NAME: string = 'general-bedrock-agent';