export enum ModelId {
  CLAUDE_SONNET_4_5 = 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
  CLAUDE_HAIKU_3 = 'eu.anthropic.claude-3-haiku-20240307-v1:0',
  GROK_4 = 'grok-4-fast-reasoning',
}

export interface ModelMetadata {
  id: ModelId;
  provider: 'anthropic' | 'xai';
  family: 'claude' | 'grok';
  contextWindow: number;
  costs: {
    input: number;
    output: number;
  };
  capabilities: {
    vision: boolean;
    streaming: boolean;
    toolUse: boolean;
  };
}

export const MODEL_REGISTRY: Record<ModelId, ModelMetadata> = {
  [ModelId.CLAUDE_SONNET_4_5]: {
    id: ModelId.CLAUDE_SONNET_4_5,
    provider: 'anthropic',
    family: 'claude',
    contextWindow: 200000,
    costs: { input: 3.00, output: 15.00 },
    capabilities: { vision: true, streaming: true, toolUse: true },
  },
  [ModelId.CLAUDE_HAIKU_3]: {
    id: ModelId.CLAUDE_HAIKU_3,
    provider: 'anthropic',
    family: 'claude',
    contextWindow: 200000,
    costs: { input: 0.25, output: 1.25 },
    capabilities: { vision: false, streaming: true, toolUse: true },
  },
  [ModelId.GROK_4]: {
    id: ModelId.GROK_4,
    provider: 'xai',
    family: 'grok',
    contextWindow: 128000,
    costs: { input: 2.00, output: 10.00 },
    capabilities: { vision: true, streaming: true, toolUse: true },
  },
};

export function getModelMetadata(modelId: ModelId | string): ModelMetadata {
  const metadata = MODEL_REGISTRY[modelId as ModelId];
  if (!metadata) {
    console.warn(`Model metadata not found for: ${modelId}, using default`);
    return MODEL_REGISTRY[ModelId.CLAUDE_SONNET_4_5];
  }
  return metadata;
}

export function getModelContextWindow(modelId: ModelId | string): number {
  return getModelMetadata(modelId).contextWindow;
}

export function getModelCosts(modelId: ModelId | string): { input: number; output: number } {
  return getModelMetadata(modelId).costs;
}

export function calculateCost(modelId: ModelId | string, inputTokens: number, outputTokens: number): number | null {
  const costs = getModelCosts(modelId);
  if (!costs) {
    console.warn(`Pricing not found for model: ${modelId}`);
    return null;
  }
  return (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output;
}
