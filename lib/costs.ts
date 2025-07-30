import type { ModelPricing } from '@/lib/types';

const modelIdMap: Record<string, string> = {
    'haiku': 'anthropic.claude-3-haiku-20240307-v1:0',
    'general-bedrock-agent': 'anthropic.claude-sonnet-4-20250514-v1:0',
    'sharepoint-agent': 'anthropic.claude-3-sonnet-20240229-v1:0',
    'sharepoint-agent-v2': 'anthropic.claude-sonnet-4-20250514-v1:0',
    'artifact-model': 'anthropic.claude-sonnet-4-20250514-v1:0',
    'bedrock-sonnet-latest': 'anthropic.claude-sonnet-4-20250514-v1:0',
    'document-agent': 'anthropic.claude-sonnet-4-20250514-v1:0',
    'csv-agent': 'anthropic.claude-sonnet-4-20250514-v1:0',
    'csv-agent-v2': 'anthropic.claude-sonnet-4-20250514-v1:0',
    'text2sql-agent': 'anthropic.claude-sonnet-4-20250514-v1:0',
    // Together AI models - pricing from their website, per 1M tokens
    'chat-model-reasoning': 'deepseek-ai/DeepSeek-R1', 
    'deepresearch-model-reasoning': 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
};

const pricing: Record<string, ModelPricing> = {
  // Amazon Bedrock pricing per 1M tokens (US region)
  'anthropic.claude-sonnet-4-20250514-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  'anthropic.claude-3-7-sonnet-20250219-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  'anthropic.claude-3-sonnet-20240229-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  'anthropic.claude-3-haiku-20240307-v1:0': { inputCost: 0.25, outputCost: 1.25 },
  'anthropic.claude-3-5-sonnet-20240620-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  // Amazon Bedrock pricing per 1M tokens (EU region)
  'eu.anthropic.claude-sonnet-4-20250514-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  'eu.anthropic.claude-3-7-sonnet-20250219-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  'eu.anthropic.claude-3-sonnet-20240229-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  'eu.anthropic.claude-3-haiku-20240307-v1:0': { inputCost: 0.25, outputCost: 1.25 },
  'eu.anthropic.claude-3-5-sonnet-20240620-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  // Other models
  'cohere.rerank-v3-5:0': { inputCost: 1.00, outputCost: 0 }, // Based on cohere.rerank-english-v3.0
  // TogetherAI pricing per 1M tokens
  'deepseek-ai/DeepSeek-R1': { inputCost: 0.14, outputCost: 0.28 },
  'deepseek-ai/DeepSeek-R1-Distill-Llama-70B': { inputCost: 0.14, outputCost: 0.28 }, 
};

/**
 * Retrieves the actual model ID from a provider-specific identifier.
 * @param providerId The identifier used in `myProvider`.
 * @returns The underlying model ID, or the original identifier if not found in the map.
 */
export function getModelId(providerId: string): string {
    return modelIdMap[providerId] ?? providerId;
}

/**
 * Calculates the cost of a model invocation based on token usage.
 * NOTE: Prices are hardcoded and may become outdated.
 * @param modelId The actual model ID.
 * @param inputTokens The number of input tokens.
 * @param outputTokens The number of output tokens.
 * @returns The calculated cost, or null if pricing is not available.
 */
export function calculateCost(modelId: string, inputTokens: number, outputTokens: number): number | null {
  const modelPricing = pricing[modelId];
  if (!modelPricing) {
    console.warn(`Pricing not found for model: ${modelId}`);
    return null;
  }
  const cost = (inputTokens / 1_000_000) * modelPricing.inputCost + (outputTokens / 1_000_000) * modelPricing.outputCost;
  return cost;
} 