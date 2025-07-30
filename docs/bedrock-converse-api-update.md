# Amazon Bedrock Converse API Updates

## Overview

This document outlines the updates made to integrate the enhanced Amazon Bedrock Converse API features into our codebase. The updates include support for:

- Enhanced request/response structure
- Guardrail configuration
- Tool configuration
- Request metadata tracking
- Improved streaming capabilities
- Better error handling and metrics

## Key Changes

### 1. Enhanced Request Structure

The Converse API now supports additional fields in the request:

```typescript
const request = {
  modelId: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
  messages: [...],
  system: [...],
  inferenceConfig: {
    maxTokens: 8192,
    temperature: 0.3,
    topP: 0.7,
    topK: 40,
    stopSequences: []
  },
  // New fields:
  requestMetadata: {
    userId: session?.user?.id,
    operation: 'file-analysis',
    timestamp: new Date().toISOString()
  },
  guardrailConfig: {
    guardrailId: 'your-guardrail-id',
    guardrailVersion: '1',
    trace: 'enabled'
  },
  toolConfig: {
    tools: [...]
  },
  additionalModelResponseFieldPaths: [
    '/stopReason',
    '/usage',
    '/metrics'
  ]
};
```

### 2. Enhanced Stream Processing

The streaming response now provides more detailed events:

```typescript
// Old approach
for await (const chunk of response.stream) {
  if (chunk.contentBlockDelta?.delta?.text) {
    // Process text
  }
}

// New approach
for await (const event of response.stream) {
  if (event.messageStart) {
    // Handle message start
  } else if (event.contentBlockDelta) {
    // Handle text, reasoning, or tool use
    const delta = event.contentBlockDelta.delta;
    if (delta.text) {
      // Process text
    } else if (delta.reasoningContent) {
      // Process reasoning
    }
  } else if (event.messageStop) {
    // Handle stop reason
  } else if (event.metadata) {
    // Handle usage and metrics
  }
}
```

### 3. Files Updated

#### `lib/ai/tools/process-file.ts`
- Added request metadata for tracking
- Enhanced stream event processing
- Improved error handling and logging
- Added support for usage metrics and stop reasons

#### `lib/bedrock/converse-types.ts` (NEW)
- TypeScript interfaces for all Converse API types
- Helper functions for request creation and event processing

#### `lib/bedrock/converse-config.ts` (NEW)
- Predefined inference configurations
- Example guardrail and tool configurations
- System prompt templates
- Helper functions for building requests

## Usage Examples

### Basic File Processing with Enhanced API

```typescript
import { createConverseRequest } from '@/lib/bedrock/converse-types';
import { INFERENCE_CONFIGS } from '@/lib/bedrock/converse-config';

const request = createConverseRequest(
  'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
  [{ role: 'user', content: contentBlocks }],
  {
    system: [{ text: 'You are a document analysis assistant...' }],
    inferenceConfig: INFERENCE_CONFIGS.precise,
    requestMetadata: {
      userId: session.user.id,
      operation: 'document-analysis',
      fileType: 'pdf'
    }
  }
);
```

### Using Guardrails

```typescript
import { CONTENT_GUARDRAIL_CONFIG } from '@/lib/bedrock/converse-config';

const request = {
  ...baseRequest,
  guardrailConfig: CONTENT_GUARDRAIL_CONFIG
};
```

### Processing Stream Events

```typescript
import { processConverseStreamEvent } from '@/lib/bedrock/converse-types';

for await (const event of response.stream) {
  processConverseStreamEvent(event, {
    onTextDelta: (text, index) => {
      dataStream.writeData({
        type: 'content',
        content: text,
        contentBlockIndex: index
      });
    },
    onMetadata: (usage, metrics) => {
      console.log('Token usage:', usage);
      console.log('Latency:', metrics.latencyMs);
    }
  });
}
```

## Benefits

1. **Better Tracking**: Request metadata allows for better monitoring and debugging
2. **Content Safety**: Guardrails can be configured to filter inappropriate content
3. **Enhanced Capabilities**: Tool configuration enables function calling
4. **Improved Observability**: Detailed metrics and usage information
5. **Type Safety**: Full TypeScript support for all API features

## Migration Guide

To update existing code:

1. Add request metadata to track operations
2. Update stream processing to handle new event types
3. Consider adding guardrails for content moderation
4. Use the type-safe interfaces from `converse-types.ts`
5. Leverage the configuration helpers from `converse-config.ts`

## Environment Variables

Add these optional environment variables to enable guardrails:

```env
BEDROCK_GUARDRAIL_ID=your-guardrail-id
BEDROCK_GUARDRAIL_VERSION=1
```

## Next Steps

1. Update remaining agents to use the enhanced API
2. Implement guardrails for production use
3. Add tool configurations for specific use cases
4. Monitor usage metrics for optimization