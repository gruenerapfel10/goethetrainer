import { chatModels } from './models';

export interface ModelCapability {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface ModelFeatures {
  fileAttachments: boolean;
  deepResearch: boolean;
  webSearch: boolean;
  imageGeneration: boolean;
  csvAnalysis: boolean;
  fileSearch: boolean;
  chartGeneration: boolean;
}

export const MODEL_CAPABILITIES: Record<string, ModelFeatures> = {
  'general-bedrock-agent': {
    fileAttachments: true,
    deepResearch: false,
    webSearch: false,
    imageGeneration: false,
    csvAnalysis: false,
    fileSearch: false,
    chartGeneration: true,
  },
  'sharepoint-agent': {
    fileAttachments: true,
    deepResearch: false,
    webSearch: false,
    imageGeneration: false,
    csvAnalysis: false,
    fileSearch: false,
    chartGeneration: false,
  },
  'sharepoint-agent-v2': {
    fileAttachments: true,
    deepResearch: true,
    webSearch: false,
    imageGeneration: false,
    csvAnalysis: false,
    fileSearch: true,
    chartGeneration: true,
  },
  'crawler-agent': {
    fileAttachments: false,
    deepResearch: false,
    webSearch: true,
    imageGeneration: false,
    csvAnalysis: false,
    fileSearch: false,
    chartGeneration: false,
  },
  'deepresearch-agent': {
    fileAttachments: false,
    deepResearch: true,
    webSearch: true,
    imageGeneration: false,
    csvAnalysis: false,
    fileSearch: false,
    chartGeneration: false,
  },
  'csv-agent': {
    fileAttachments: true,
    deepResearch: false,
    webSearch: false,
    imageGeneration: false,
    csvAnalysis: true,
    fileSearch: false,
    chartGeneration: false,
  },
  'csv-agent-v2': {
    fileAttachments: true,
    deepResearch: false,
    webSearch: false,
    imageGeneration: false,
    csvAnalysis: true,
    fileSearch: false,
    chartGeneration: true,
  },
  'image-agent': {
    fileAttachments: true,
    deepResearch: false,
    webSearch: false,
    imageGeneration: true,
    csvAnalysis: false,
    fileSearch: false,
    chartGeneration: false,
  },
};

export function getModelCapabilities(modelId: string): ModelFeatures {
  return MODEL_CAPABILITIES[modelId] || {
    fileAttachments: false,
    deepResearch: false,
    webSearch: false,
    imageGeneration: false,
    csvAnalysis: false,
    fileSearch: false,
    chartGeneration: false,
  };
}

export function supportsFeature(modelId: string, feature: keyof ModelFeatures): boolean {
  const capabilities = getModelCapabilities(modelId);
  return capabilities[feature] || false;
} 