import {
  type UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { saveMessages } from '@/lib/firebase/chat-service';
import {
  generateUUID,
  getTrailingMessageId,
  messagesWithoutFiles,
} from '@/lib/utils';
import { processFile } from '@/lib/ai/tools/process-file';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { supportsFeature } from '@/lib/ai/model-capabilities';
import FirecrawlApp from '@/lib/firecrawl/firecrawl-client';
import type {AgentMeta} from "@/app/(chat)/api/chat/agent.type";
import { addToolConstraints } from '@/lib/utils/message-filter';
import { enhanceSystemPromptWithTools } from '@/lib/ai/tool-prompts';
import {
  getAgentTypeFromString,
  initializeRegularTools,
  initializeDeepResearchTools,
  getAvailableRegularToolNames,
  getFilteredRegularToolNames
} from '@/lib/ai/agent-registry';

export const maxDuration = 60;

const app = new FirecrawlApp(
  process.env.FIRECRAWL_URL ?? '', 
  process.env.FIRECRAWL_API_KEY
);
let firecrawlTokens = 0;

export async function streamGeneralAgent(
  agentMeta: AgentMeta,
  messages: Array<UIMessage>,
  id: string,
  selectedChatModel: string,
  webSearch = false,
  deepResearch = false,
  imageGeneration = false,
) {

  const {
    session,
    userMessage,
    model,
    titleOutputTokens,
    titleInputTokens,
  } = agentMeta;
    
    
    const baseSystemText = await getSystemPrompt(
      selectedChatModel === 'job-assistant' ? 'job-assistant' :
      selectedChatModel === 'image-agent' ? 'image-agent' : 
      webSearch ? 'web-agent' : 
      'general-assistant'
    );
    
    let enhancedSystemText = baseSystemText;
    
    const capabilityStatus = [];
    if (supportsFeature(selectedChatModel, 'webSearch')) {
      capabilityStatus.push(`Web Search: ${webSearch ? 'ENABLED' : 'DISABLED'}`);
    }
    if (supportsFeature(selectedChatModel, 'deepSearch')) {
      capabilityStatus.push(`Deep Research: ${deepResearch ? 'ENABLED' : 'DISABLED'}`);
    }
    if (supportsFeature(selectedChatModel, 'imageGeneration')) {
      capabilityStatus.push(`Image Generation: ${imageGeneration ? 'ENABLED' : 'DISABLED'}`);
    }
    
    if (capabilityStatus.length > 0) {
      enhancedSystemText += `\n\nCURRENT CAPABILITY STATUS:\n${capabilityStatus.join('\n')}\n\nIMPORTANT: Only use tools that are ENABLED. If a user asks for a disabled capability, politely explain that the feature is currently disabled and suggest they enable it using the toggle buttons.`;
    }
    
    const systemText = deepResearch 
      ? `${enhancedSystemText}\n\nIMPORTANT: You are currently in DEEP RESEARCH MODE.\n- You MUST use the 'reason_search' tool for this query\n- Call it with the user's query as the topic\n- Example: reason_search({ topic: "user's question here", depth: "basic" })\n- Wait for the complete research results before responding\n- The tool will handle multiple searches and synthesis automatically`
      : enhancedSystemText;
    
    const agentType = getAgentTypeFromString(
      selectedChatModel === 'job-assistant' ? 'general-assistant' :
      selectedChatModel === 'image-agent' ? 'image-agent' :
      webSearch ? 'web-agent' : 
      'general-assistant'
    );
    
    const availableToolNames = deepResearch 
      ? ['reason_search']
      : getFilteredRegularToolNames(agentType, { webSearch, imageGeneration });
    
    const activeToolsList = deepResearch 
      ? []
      : availableToolNames.filter(tool => tool !== 'reason_search');
    
    // Log available tools for security audit
    console.log(`[Security] Agent: ${selectedChatModel}, Available tools:`, availableToolNames);
    console.log(`[Security] Capabilities - WebSearch: ${webSearch}, ImageGen: ${imageGeneration}, DeepResearch: ${deepResearch}`);
    
    const constrainedSystemText = addToolConstraints(systemText, availableToolNames);
    
    const finalSystemText = enhanceSystemPromptWithTools(constrainedSystemText, availableToolNames);

    return createDataStreamResponse({
      execute: async (dataStream) => {
        if (deepResearch) {
          dataStream.writeData({
            type: 'status',
            content: 'initializing'
          });

          const researchUpdates: any[] = [];
          
          const originalWriteMessageAnnotation = dataStream.writeMessageAnnotation.bind(dataStream);
          dataStream.writeMessageAnnotation = (annotation: any) => {
            if (annotation.type === 'research_update') {
              researchUpdates.push(annotation.data);
            }
            return originalWriteMessageAnnotation(annotation);
          };

          const result = streamText({
            model: model,
            maxSteps: 2,
            messages: messagesWithoutFiles(messages),
            experimental_transform: smoothStream({
              chunking: 'word',
              delayInMs: 15,
            }),
            experimental_generateMessageId: generateUUID,
            temperature: 0,
            experimental_activeTools: ['reason_search'],
            system: finalSystemText,
            tools: initializeDeepResearchTools({
              session,
              dataStream,
            }),
            onChunk(event) {
              if (event.chunk.type === 'tool-call') {
                dataStream.writeData({
                  type: 'status',
                  content: `executing-${event.chunk.toolName}`
                });
              }
            },
            onStepFinish(event) {
              if (event.warnings) {
              }
              dataStream.writeData({
                type: 'status',
                content: 'step-completed'
              });
            },
            onFinish: async ({ response, usage }) => {
              try {
                dataStream.writeData({
                  type: 'status',
                  content: 'saving'
                });

                if (session.user?.id) {
                  const assistantId = getTrailingMessageId({
                    messages: response.messages.filter(
                      (message) => message.role === 'assistant',
                    ),
                  });

                  if (!assistantId) {
                    throw new Error('No assistant message found!');
                  }

                  const [, assistantMessage] = appendResponseMessages({
                    messages: [userMessage],
                    responseMessages: response.messages,
                  });

                  let researchProgressAttachment = null;
                  
                  if (researchUpdates.length > 0) {
                    researchProgressAttachment = {
                      type: 'research-progress',
                      updates: researchUpdates,
                      timestamp: Date.now()
                    };
                  }

                  const attachments = researchProgressAttachment ? [researchProgressAttachment] : [];

                  await saveMessages({
                    messages: [
                      {
                        id: assistantId,
                        chatId: id,
                        role: assistantMessage.role,
                        parts: assistantMessage.parts,
                        attachments: attachments,
                        createdAt: new Date(),
                        useCaseId: null,
                        agentType: selectedChatModel,
                        modelId: model.modelId,
                        inputTokens: (usage?.promptTokens ?? 0) + titleInputTokens,
                        outputTokens: (usage.completionTokens ?? 0) + titleOutputTokens,
                        processed: false,
                      },
                    ],
                  });
                }

                dataStream.writeData({
                  type: 'status',
                  content: 'completed'
                });

                dataStream.writeData({
                  type: 'finish',
                  content: 'research-complete'
                });

              } catch (error) {
                console.error('Failed to save chat:', error);
                dataStream.writeData({
                  type: 'error',
                  content: 'Failed to save research results'
                });
              }
            },
            onError(event) {
              const errorMessage = event.error instanceof Error
                ? event.error.message
                : String(event.error);
              dataStream.writeData({
                type: 'error',
                content: errorMessage
              });
            },
            experimental_telemetry: {
              isEnabled: true,
              functionId: 'stream-text',
            },
          });

          result.mergeIntoDataStream(dataStream);
        } else {
          const fileProcessor = processFile({
            session,
            dataStream,
          });

          const { enhancedSystemPrompt, hasProcessedFiles } =
            await fileProcessor.processMultipleFiles(messages, finalSystemText);

          const result = streamText({
            model,
          system: enhancedSystemPrompt(finalSystemText),
          messages: messagesWithoutFiles(messages),
          maxSteps: 6,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
            tools: {
              ...initializeRegularTools(agentType, {
                session,
                dataStream,
                userMessage,
                app,
                webSearch,
                imageGeneration,
                onTokensUsed: (tokens) => {
                  firecrawlTokens += tokens;
                },
              }),
              processFile: fileProcessor,
            },
            toolChoice: 'auto',
            onFinish: async ({ response, usage }) => {
              if (session.user?.id) {
                try {
                  const assistantId = getTrailingMessageId({
                    messages: response.messages.filter(
                      (message) => message.role === 'assistant',
                    ),
                  });

                  if (!assistantId) {
                    throw new Error('No assistant message found!');
                  }

                  const [, assistantMessage] = appendResponseMessages({
                    messages: [userMessage],
                    responseMessages: response.messages,
                  });

                  await saveMessages({
                    messages: [
                      {
                        id: assistantId,
                        chatId: id,
                        role: assistantMessage.role,
                        parts: assistantMessage.parts,
                        attachments: [],
                        createdAt: new Date(),
                        useCaseId: null,
                        agentType: selectedChatModel,
                        modelId: model.modelId,
                        inputTokens: (usage.promptTokens ?? 0) + (webSearch ? firecrawlTokens : 0) + (titleInputTokens || 0),
                        outputTokens: (usage.completionTokens ?? 0) + (titleOutputTokens || 0),
                        processed: false,
                      },
                    ],
                  });
                } catch (error) {
                  console.error('Failed to save chat:', error);
                }
              }
            },
            experimental_telemetry: {
              isEnabled: true,
              functionId: 'stream-text',
            },
          });

          result.mergeIntoDataStream(dataStream, {
            sendReasoning: true,
          });
        }
      },
      onError: (err) => {
        console.error('Error in stream:', err);
        return 'Oops, an error occurred!';
      },
    });
}