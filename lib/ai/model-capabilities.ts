

export interface ModelCapability {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface ModelFeatures {
  fileAttachments: boolean;
  deepSearch: boolean;
  webSearch: boolean;
  imageGeneration: boolean;
  csvAnalysis: boolean;
  fileSearch: boolean;
  chartGeneration: boolean;
}

export const MODEL_CAPABILITIES: Record<string, ModelFeatures> = {
  'general-bedrock-agent': {
    fileAttachments: true,
    deepSearch: true,
    webSearch: true,
    imageGeneration: true,
    csvAnalysis: false,
    fileSearch: false,
    chartGeneration: true,
  },
  'sharepoint-agent': {
    fileAttachments: true,
    deepSearch: false,
    webSearch: false,
    imageGeneration: false,
    csvAnalysis: false,
    fileSearch: false,
    chartGeneration: false,
  },
  'sharepoint-agent-v2': {
    fileAttachments: true,
    deepSearch: true,
    webSearch: false,
    imageGeneration: false,
    csvAnalysis: false,
    fileSearch: true,
    chartGeneration: true,
  },
  'csv-agent': {
    fileAttachments: true,
    deepSearch: false,
    webSearch: false,
    imageGeneration: false,
    csvAnalysis: true,
    fileSearch: false,
    chartGeneration: false,
  },
  'csv-agent-v2': {
    fileAttachments: true,
    deepSearch: false,
    webSearch: false,
    imageGeneration: false,
    csvAnalysis: true,
    fileSearch: false,
    chartGeneration: true,
  },
  'text2sql-agent': {
    fileAttachments: false,
    deepSearch: false,
    webSearch: false,
    imageGeneration: false,
    csvAnalysis: false,
    fileSearch: false,
    chartGeneration: false,
  },
};

export function getModelCapabilities(modelId: string): ModelFeatures {
  return MODEL_CAPABILITIES[modelId] || {
    fileAttachments: false,
    deepSearch: false,
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