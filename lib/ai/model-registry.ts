export enum ModelId {
  CLAUDE_SONNET_4_5 = 'claude-sonnet-4-5-20250514',
  CLAUDE_HAIKU_4_5 = 'claude-haiku-4-5-20251001',
}

export interface ModelMetadata {
  id: ModelId;
  provider: 'anthropic';
  family: 'claude';
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
  [ModelId.CLAUDE_HAIKU_4_5]: {
    id: ModelId.CLAUDE_HAIKU_4_5,
    provider: 'anthropic',
    family: 'claude',
    contextWindow: 200000,
    costs: { input: 0.80, output: 4.00 },
    capabilities: { vision: true, streaming: true, toolUse: true },
  },
};

export function getModelMetadata(modelId: ModelId | string): ModelMetadata {
  const metadata = MODEL_REGISTRY[modelId as ModelId];
  if (!metadata) {
    console.warn(`Model metadata not found for: ${modelId}, using default`);
    return MODEL_REGISTRY[ModelId.CLAUDE_HAIKU_4_5];
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
