import {
  type UIMessage,
  type LanguageModel,
  streamText,
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  tool,
  generateId
} from 'ai';
import { z } from 'zod';
import { getChatContext } from '@/lib/ai/chat-manager';
import {
  getAgentConfig,
  getAgentTypeFromModel,
  getAgentModelId,
  getAgentPrompt
} from '@/lib/ai/agents';
import { ToolName } from '@/lib/ai/tools/tool-registry';
import { streamBufferManager } from '@/lib/ai/stream-buffer';

// Import tool implementations
import { chartTool } from '@/lib/ai/tools/chart';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';

export const maxDuration = 60;

import type { AgentTools, AgentFeatures } from '@/contexts/chat-context';

interface StreamAgentOptions {
  session: { user: { id: string; email?: string | null } };
  model: LanguageModel;
  userMessage: UIMessage;
  messages: Array<UIMessage>;
  chatId: string;
  selectedChatModel: string;
  agentTools: AgentTools;
  agentFeatures: AgentFeatures;
  userLocale?: string;
  systemQueue?: string[] | null;
}

// Initialize all active tools at once
async function initializeActiveTools(
  agentTools: AgentTools,
  session: Session,
  chatId: string
): Promise<Record<string, any>> {
  const entries = await Promise.all(
    Object.entries(agentTools)
      .filter(([_, config]) => config.active)
      .map(async ([toolName, _]) => {
        try {
          const tool = await initializeTool(toolName as ToolName, session, chatId);
          return tool ? [toolName, tool] : null;
        } catch (error) {
          console.error(`Failed to initialize tool: ${toolName}`, error);
          return null;
        }
      })
  );

  return Object.fromEntries(entries.filter(e => e !== null) as Array<[string, any]>);
}

const toolLoaders: Record<string, (session: Session, chatId: string) => Promise<any>> = {
  [ToolName.CHART]: async () => chartTool,
  [ToolName.GET_WEATHER]: async () => getWeather,
  [ToolName.PROCESS_FILE]: async () => null,
  [ToolName.CREATE_DOCUMENT]: async (session, chatId) => (await import('@/lib/ai/tools/create-document')).createDocument(session, chatId),
  [ToolName.UPDATE_DOCUMENT]: async (session, chatId) => (await import('@/lib/ai/tools/update-document')).updateDocument(session, chatId),
  [ToolName.REQUEST_SUGGESTIONS]: async () => requestSuggestions(),
  [ToolName.SEARCH]: async () => (await import('@/lib/ai/tools/search')).search(),
  [ToolName.EXTRACT]: async () => (await import('@/lib/ai/tools/extract')).extract(),
  [ToolName.SCRAPE]: async () => (await import('@/lib/ai/tools/scrape')).scrape(),
  [ToolName.DEEP_RESEARCH]: async () => (await import('@/lib/ai/tools/deep-research')).deepResearch(),
  // Image tooling disabled for now to avoid missing module errors
  [ToolName.GENERATE_IMAGE]: async () =>
    tool({
      description: 'Image generation is disabled in this deployment.',
      inputSchema: z.object({ prompt: z.string() }),
      execute: async () => ({
        status: 'error',
        message: 'Image generation is not available in this deployment.',
      }),
    }),
  [ToolName.EDIT_IMAGE]: async () =>
    tool({
      description: 'Image editing is disabled in this deployment.',
      inputSchema: z.object({
        imageUrl: z.string().url(),
        instructions: z.string(),
      }),
      execute: async () => ({
        status: 'error',
        message: 'Image editing is not available in this deployment.',
      }),
    }),
};

async function initializeTool(toolName: ToolName, session: Session, chatId: string): Promise<any> {
  const loader = toolLoaders[toolName];
  if (!loader) {
    console.warn(`Unknown tool: ${toolName}`);
    return null;
  }
  return loader(session, chatId);
}

export async function streamStandardAgent(options: StreamAgentOptions) {
  const {
    session,
    model,
    userMessage,
    messages,
    chatId,
    selectedChatModel,
    agentTools,
    agentFeatures,
    userLocale = 'en',
    systemQueue,
  } = options;

  const agentType = getAgentTypeFromModel(selectedChatModel);
  const actualModelId = getAgentModelId(agentType);
  const config = getAgentConfig(agentType);

  const toolFeatureFlags = Object.fromEntries([
    ...Object.entries(agentTools || {}).map(([k, v]) => [k, v.active]),
    ...Object.entries(agentFeatures || {}).map(([k, v]) => [k, v.active])
  ]);
  
  const languageInstruction = userLocale === 'lt'
    ? '\n\nIMPORTANT: You must respond in Lithuanian language.'
    : userLocale === 'en'
      ? '\n\nIMPORTANT: You must respond in English language.'
      : `\n\nIMPORTANT: You must respond in ${userLocale} language.`;

  // Fetch custom prompt from DB if exists
  const { getSystemPromptByAssistantId } = await import('@/lib/db/queries');
  const { AGENT_TO_ASSISTANT } = await import('@/lib/ai/agents');
  const assistantId = AGENT_TO_ASSISTANT[agentType];
  const customPrompt = await getSystemPromptByAssistantId(assistantId);

  let systemPrompt = getAgentPrompt(agentType, { ...toolFeatureFlags, customPrompt: customPrompt || undefined }) + languageInstruction;

  // Append system queue messages if they exist
  if (systemQueue && systemQueue.length > 0) {
    const queueMessages = systemQueue.join('\n\n');
    systemPrompt += `\n\n## Additional Context:\n${queueMessages}`;
  }

  const chatContext = await getChatContext(chatId);
  await chatContext.initialize(session.user.id);
  
  const initializedTools = await initializeActiveTools(agentTools || {}, session, chatId);

  await chatContext.addMessage(userMessage);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools: initializedTools,
    ...(config.model.maxSteps && { maxSteps: config.model.maxSteps }),
    ...(config.model.maxSteps && { stopWhen: stepCountIs(config.model.maxSteps) }),
    toolChoice: config.model.toolChoice,
    temperature: config.model.temperature,
    experimental_transform: smoothStream({ chunking: 'word' }),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'stream-text',
    },
    headers: {
      'anthropic-beta': 'interleaved-thinking-2025-05-14',
    },
    prepareStep: async ({ model, stepNumber, steps, messages }) => {
      return {}
    }
  });

  let metadata: any = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    modelId: null,
    agentType: null
  };

  // Generate unique stream ID for this response
  const streamId = generateId();

  const response = result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === 'finish') {
        metadata = {
          inputTokens: part.totalUsage?.inputTokens || 0,
          outputTokens: part.totalUsage?.outputTokens || 0,
          totalTokens: part.totalUsage?.totalTokens || 0,
          modelId: actualModelId,
          agentType
        };
        return metadata;
      }
    },
    onFinish: async (params) => {
      if (params.responseMessage && metadata) {
        await chatContext.addMessage(params.responseMessage, metadata);
      } else if (params.messages?.length) {
        const lastMessage = params.messages[params.messages.length - 1];
        if (lastMessage.role === 'assistant') {
          await chatContext.addMessage(lastMessage, metadata);
        }
      }

      streamBufferManager.markComplete(streamId);
      streamBufferManager.clearCompletedBuffersForChat(chatId);
    },
    async consumeSseStream({ stream }) {
      const reader = stream.getReader() as unknown as ReadableStreamDefaultReader<Uint8Array>;
      streamBufferManager.createBuffer(chatId, streamId, reader);

      const encoder = new TextEncoder();
      let chunkCount = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          if (value) {
            chunkCount++;
            const chunk = typeof value === 'string' ? encoder.encode(value) : value;
            streamBufferManager.addChunk(streamId, chunk);

            if (chunkCount % 20 === 0) {
              console.log(`[StreamAgent] Buffered ${chunkCount} chunks...`);
            }
          }
        }
      } catch (error) {
        console.error(`[StreamAgent] Error buffering stream:`, error);
        streamBufferManager.clearBuffer(streamId);
      }
    }
  });

  return response;
}
