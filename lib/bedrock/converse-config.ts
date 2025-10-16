/**
 * Configuration and examples for Amazon Bedrock Converse API
 */

import type { 
  ConverseGuardrailConfig, 
  ConverseToolConfig,
  ConverseInferenceConfig 
} from './converse-types';

/**
 * Default inference configuration for different use cases
 */
export const INFERENCE_CONFIGS: Record<string, ConverseInferenceConfig> = {
  creative: {
    maxTokens: 4096,
    temperature: 0.9,
    topP: 0.95,
    topK: 50,
  },
  balanced: {
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.85,
    topK: 40,
  },
  precise: {
    maxTokens: 8192,
    temperature: 0.3,
    topP: 0.7,
    topK: 30,
  },
  factual: {
    maxTokens: 8192,
    temperature: 0.1,
    topP: 0.5,
    topK: 20,
  }
};

/**
 * Example guardrail configuration for content moderation
 */
export const CONTENT_GUARDRAIL_CONFIG: ConverseGuardrailConfig = {
  guardrailId: process.env.BEDROCK_GUARDRAIL_ID || '',
  guardrailVersion: process.env.BEDROCK_GUARDRAIL_VERSION || '1',
  trace: 'enabled', // Enable to see what the guardrail blocked
};

/**
 * Example tool configuration for function calling
 */
export const EXAMPLE_TOOL_CONFIG: ConverseToolConfig = {
  tools: [
    {
      name: 'search_knowledge_base',
      description: 'Search the company knowledge base for relevant information',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant documents'
          },
          filters: {
            type: 'object',
            properties: {
              department: {
                type: 'string',
                description: 'Filter by department (optional)'
              },
              dateRange: {
                type: 'object',
                properties: {
                  start: { type: 'string', format: 'date' },
                  end: { type: 'string', format: 'date' }
                }
              }
            }
          }
        },
        required: ['query']
      }
    },
    {
      name: 'calculate_metrics',
      description: 'Calculate business metrics from provided data',
      inputSchema: {
        type: 'object',
        properties: {
          metric_type: {
            type: 'string',
            enum: ['revenue', 'growth', 'conversion', 'retention'],
            description: 'Type of metric to calculate'
          },
          data_points: {
            type: 'array',
            items: {
              type: 'number'
            },
            description: 'Array of numeric data points'
          },
          period: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
            description: 'Time period for calculation'
          }
        },
        required: ['metric_type', 'data_points']
      }
    }
  ]
};

/**
 * System prompts for different agent types
 */
export const SYSTEM_PROMPTS = {
  general: `You are a helpful AI assistant with access to various tools and knowledge bases. 
Your responses should be accurate, helpful, and appropriately detailed based on the user's query.`,
  
  analyst: `You are a data analyst assistant specializing in business intelligence and metrics.
Focus on providing clear, data-driven insights and actionable recommendations.
Always cite your sources and explain your calculations.`,
  
  support: `You are a customer support assistant with access to company documentation and policies.
Be empathetic, solution-oriented, and escalate to human support when appropriate.
Always verify information from the knowledge base before responding.`
};

/**
 * Example of prompt caching configuration
 */
export const CACHE_CONFIG = {
  // Cache system prompts for frequently used contexts
  cacheableSystemPrompts: [
    'system-general',
    'system-analyst', 
    'system-support'
  ],
  // Cache tool definitions that don't change often
  cacheableTools: true,
  // Cache time in seconds
  cacheTTL: 3600 // 1 hour
};

/**
 * Helper function to build a complete Converse request with all features
 */
export function buildEnhancedConverseRequest({
  modelId,
  messages,
  systemPrompt,
  inferencePreset = 'balanced',
  enableGuardrails = false,
  enableTools = false,
  requestMetadata = {},
  additionalResponseFields = []
}: {
  modelId: string;
  messages: any[];
  systemPrompt?: string;
  inferencePreset?: keyof typeof INFERENCE_CONFIGS;
  enableGuardrails?: boolean;
  enableTools?: boolean;
  requestMetadata?: Record<string, any>;
  additionalResponseFields?: string[];
}) {
  return {
    modelId,
    messages,
    system: systemPrompt ? [{ text: systemPrompt }] : undefined,
    inferenceConfig: INFERENCE_CONFIGS[inferencePreset],
    guardrailConfig: enableGuardrails ? CONTENT_GUARDRAIL_CONFIG : undefined,
    toolConfig: enableTools ? EXAMPLE_TOOL_CONFIG : undefined,
    requestMetadata: {
      timestamp: new Date().toISOString(),
      ...requestMetadata
    },
    additionalModelResponseFieldPaths: [
      '/stopReason',
      '/usage',
      '/metrics',
      ...additionalResponseFields
    ]
  };
} 