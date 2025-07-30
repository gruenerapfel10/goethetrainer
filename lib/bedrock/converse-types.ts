/**
 * Types and interfaces for Amazon Bedrock Converse API
 */

export interface ConverseRequestMetadata {
  userId?: string;
  operation?: string;
  fileType?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface ConverseInferenceConfig {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

export interface ConverseGuardrailConfig {
  guardrailId: string;
  guardrailVersion: string;
  trace?: 'enabled' | 'disabled';
}

export interface ConverseToolConfig {
  tools: ConverseToolDefinition[];
}

export interface ConverseToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

export interface ConverseStreamEvent {
  messageStart?: {
    role: 'user' | 'assistant';
  };
  contentBlockStart?: {
    contentBlockIndex: number;
  };
  contentBlockDelta?: {
    delta: {
      text?: string;
      reasoningContent?: string;
      toolUse?: any;
    };
    contentBlockIndex: number;
  };
  contentBlockStop?: {
    contentBlockIndex: number;
  };
  messageStop?: {
    stopReason: string;
  };
  metadata?: {
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cacheReadInputTokensCount?: number;
      cacheWriteInputTokensCount?: number;
    };
    metrics: {
      latencyMs: number;
    };
  };
}

export interface EnhancedConverseRequest {
  modelId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: any[];
  }>;
  system?: Array<{
    text: string;
  }>;
  inferenceConfig?: ConverseInferenceConfig;
  additionalModelRequestFields?: Record<string, any>;
  promptVariables?: Record<string, string>;
  guardrailConfig?: ConverseGuardrailConfig;
  toolConfig?: ConverseToolConfig;
  additionalModelResponseFieldPaths?: string[];
  requestMetadata?: ConverseRequestMetadata;
}

export interface EnhancedConverseResponse {
  output: {
    message: {
      role: 'assistant';
      content: Array<{
        text?: string;
      }>;
    };
  };
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheReadInputTokensCount?: number;
    cacheWriteInputTokensCount?: number;
  };
  metrics: {
    latencyMs: number;
  };
  additionalModelResponseFields?: Record<string, any>;
}

/**
 * Helper function to create a properly typed Converse request
 */
export function createConverseRequest(
  modelId: string,
  messages: any[],
  options?: Partial<EnhancedConverseRequest>
): EnhancedConverseRequest {
  return {
    modelId,
    messages,
    ...options,
  };
}

/**
 * Helper function to process stream events
 */
export function processConverseStreamEvent(
  event: ConverseStreamEvent,
  handlers: {
    onMessageStart?: (role: string) => void;
    onContentBlockStart?: (index: number) => void;
    onTextDelta?: (text: string, index: number) => void;
    onReasoningDelta?: (reasoning: string, index: number) => void;
    onContentBlockStop?: (index: number) => void;
    onMessageStop?: (stopReason: string) => void;
    onMetadata?: (usage: any, metrics: any) => void;
  }
) {
  if (event.messageStart && handlers.onMessageStart) {
    handlers.onMessageStart(event.messageStart.role);
  } else if (event.contentBlockStart && handlers.onContentBlockStart) {
    handlers.onContentBlockStart(event.contentBlockStart.contentBlockIndex);
  } else if (event.contentBlockDelta) {
    const delta = event.contentBlockDelta.delta;
    const index = event.contentBlockDelta.contentBlockIndex;
    if (delta.text && handlers.onTextDelta) {
      handlers.onTextDelta(delta.text, index);
    } else if (delta.reasoningContent && handlers.onReasoningDelta) {
      handlers.onReasoningDelta(delta.reasoningContent, index);
    }
  } else if (event.contentBlockStop && handlers.onContentBlockStop) {
    handlers.onContentBlockStop(event.contentBlockStop.contentBlockIndex);
  } else if (event.messageStop && handlers.onMessageStop) {
    handlers.onMessageStop(event.messageStop.stopReason);
  } else if (event.metadata && handlers.onMetadata) {
    handlers.onMetadata(event.metadata.usage, event.metadata.metrics);
  }
} 