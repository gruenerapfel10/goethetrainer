import type { ModelPricing } from '@/lib/types';

const modelIdMap: Record<string, string> = {
    // Legacy mappings now point to Gemini
    'haiku': 'gemini-2.5-flash',
    'general-bedrock-agent': 'gemini-2.5-flash',
    'sharepoint-agent': 'gemini-2.5-flash',
    'sharepoint-agent-v2': 'gemini-2.5-flash',
    'artifact-model': 'gemini-2.5-flash',
    'bedrock-sonnet-latest': 'gemini-2.5-flash',
    'document-agent': 'gemini-2.5-flash',
    'csv-agent': 'gemini-2.5-flash',
    'csv-agent-v2': 'gemini-2.5-flash',
    'text2sql-agent': 'gemini-2.5-flash',
    // Together AI models - pricing from their website, per 1M tokens
    'chat-model-reasoning': 'deepseek-ai/DeepSeek-R1', 
    'deepresearch-model-reasoning': 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
};

const pricing: Record<string, ModelPricing> = {
  // Google Gemini pricing per 1M tokens (Google AI Studio pricing)
  'gemini-2.5-flash': { inputCost: 0.075, outputCost: 0.30 },  // Very cost effective
  'gemini-2.5-pro': { inputCost: 1.25, outputCost: 5.00 },    // More capable, higher cost
  'gemini-2.0-flash': { inputCost: 0.075, outputCost: 0.30 }, // Fallback
  'gemini-1.5-flash': { inputCost: 0.075, outputCost: 0.30 }, // Fallback
  'gemini-1.5-pro': { inputCost: 1.25, outputCost: 5.00 },    // Fallback
  
  // Legacy Bedrock pricing (for cost comparison/migration)
  'anthropic.claude-sonnet-4-20250514-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  'anthropic.claude-3-7-sonnet-20250219-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  'anthropic.claude-3-sonnet-20240229-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  'anthropic.claude-3-haiku-20240307-v1:0': { inputCost: 0.25, outputCost: 1.25 },
  'anthropic.claude-3-5-sonnet-20240620-v1:0': { inputCost: 3.00, outputCost: 15.00 },
  
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
  
  // Ensure tokens are valid numbers
  const safeInputTokens = isNaN(inputTokens) ? 0 : inputTokens;
  const safeOutputTokens = isNaN(outputTokens) ? 0 : outputTokens;
  
  const cost = (safeInputTokens / 1_000_000) * modelPricing.inputCost + (safeOutputTokens / 1_000_000) * modelPricing.outputCost;
  
  // Ensure the result is a valid number
  return isNaN(cost) ? 0 : cost;
}

/**
 * Safely formats a cost value with error handling
 * @param cost The cost value to format
 * @returns Formatted cost string
 */
export function formatCost(cost: any): string {
  // Handle null/undefined
  if (cost === null || cost === undefined) {
    return '$0.0000';
  }
  
  // Convert to number if it's not already
  const numericCost = typeof cost === 'number' ? cost : parseFloat(cost);
  
  // Handle invalid numbers
  if (isNaN(numericCost)) {
    return '$0.0000';
  }
  
  // Handle very small costs
  if (numericCost > 0 && numericCost < 0.0001) {
    return '<$0.0001';
  }
  
  return `$${numericCost.toFixed(4)}`;
}