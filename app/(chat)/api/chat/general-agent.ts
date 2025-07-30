import {
  type UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { saveMessages } from '@/lib/db/queries';
import {
  generateUUID,
  getTrailingMessageId,
  messagesWithoutFiles,
} from '@/lib/utils';
import { processFile } from '@/lib/ai/tools/process-file';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { supportsFeature } from '@/lib/ai/model-capabilities';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { chartTool } from '@/lib/ai/tools/chart';
import { search } from '@/lib/ai/tools/search';
import { extract } from '@/lib/ai/tools/extract';
import { scrape } from '@/lib/ai/tools/scrape';
import { deepResearch as deepResearchTool } from '@/lib/ai/tools/deep-research';
import { mapControl } from '@/lib/ai/tools/map-control';
import { connectorTool, listConnectorsTool } from '@/lib/ai/tools/connector-tool';
import { initializeConnectors } from '@/lib/connectors';
import FirecrawlApp from '@/lib/firecrawl/firecrawl-client';
import type {AgentMeta} from "@/app/(chat)/api/chat/agent.type";
import { addToolConstraints } from '@/lib/utils/message-filter';
import { enhanceSystemPromptWithTools } from '@/lib/ai/tool-prompts';

// Initialize connectors on module load
initializeConnectors();

export const maxDuration = 60;

const app = new FirecrawlApp(process.env.FIRECRAWL_URL ?? '');
let firecrawlTokens = 0;

// Main streaming handler for general assistant
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
    
    // For web search mode, prepare working messages
    const workingMessages = webSearch && !deepResearch ? [...messages] : messages;
    
    if (webSearch && !deepResearch) {
      // Check if there are URLs in the user message
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const containsUrls = urlRegex.test(userMessage.content);

      // Add an assistant reminder message before the most recent user message
      const lastUserMessageIndex = workingMessages.findIndex(
        (msg) =>
          msg.id === userMessage.id ||
          (msg.role === 'user' && msg.content === userMessage.content),
      );

      if (lastUserMessageIndex > 1) {
        workingMessages.splice(lastUserMessageIndex, 0, {
          id: generateUUID(),
          role: 'assistant',
          content: `I'll help you with that. Remember, I MUST use my tools first before responding
${
  containsUrls
    ? 'I see you provided a URL. I will use the scrape tool on it. DO NOT reflect on the quality of the returned search results in your response.'
    : 'I will first search for information, then extract relevant details. DO NOT reflect on the quality of the returned search results in your response.'
}`,
        } as UIMessage);
      }
    }
    
    // Get appropriate system prompt
    const baseSystemText = await getSystemPrompt(
      selectedChatModel === 'image-agent' ? 'image-agent' : 
      webSearch ? 'web-agent' : 
      'general-assistant'
    );
    
    // Enhance system prompt with capability status
    let enhancedSystemText = baseSystemText;
    
    // Add capability status to system prompt
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
    
    // Add deep research mode instructions
    const systemText = deepResearch 
      ? `${enhancedSystemText}\n\nIMPORTANT: You are currently in DEEP RESEARCH MODE.\n- You MUST use the 'reason_search' tool for this query\n- Call it with the user's query as the topic\n- Example: reason_search({ topic: "user's question here", depth: "basic" })\n- Wait for the complete research results before responding\n- The tool will handle multiple searches and synthesis automatically`
      : enhancedSystemText;
    
    // Define available tools for this agent based on capabilities
    const baseTools = ['getWeather', 'requestSuggestions', 'processFile', 'chart', 'createDocument', 'updateDocument', 'mapControl', 'connector', 'listConnectors'] as const;
    const webTools = webSearch && !deepResearch ? (['search', 'extract', 'scrape'] as const) : ([] as const);
    const deepResearchTools = deepResearch ? (['reason_search'] as const) : ([] as const);
    const availableTools = [...baseTools, ...webTools, ...deepResearchTools];
    
    // Create active tools list without reason_search for experimental_activeTools
    type ActiveToolType = "search" | "getWeather" | "requestSuggestions" | "processFile" | "chart" | "createDocument" | "updateDocument" | "extract" | "scrape" | "mapControl" | "connector" | "listConnectors";
    const activeToolsList: ActiveToolType[] = [...baseTools, ...webTools] as ActiveToolType[];
    
    // Add tool constraints to system prompt
    const constrainedSystemText = addToolConstraints(systemText, availableTools);
    
    // Enhance with tool-specific prompts
    const finalSystemText = enhanceSystemPromptWithTools(constrainedSystemText, availableTools);

    return createDataStreamResponse({
      execute: async (dataStream) => {
        if (deepResearch) {
          // Deep Research Mode
          dataStream.writeData({
            type: 'status',
            content: 'initializing'
          });

          // Track all research updates for saving
          const researchUpdates: any[] = [];
          
          // Override writeMessageAnnotation to capture updates
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
            tools: {
              reason_search: deepResearchTool({
                session,
                dataStream,
              }),
            },
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
                console.log('Warnings: ', event.warnings);
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

                  // Save all research updates as an attachment for 1:1 UI restoration
                  let researchProgressAttachment = null;
                  
                  if (researchUpdates.length > 0) {
                    // Create attachment with all research updates for exact UI restoration
                    researchProgressAttachment = {
                      type: 'research-progress',
                      updates: researchUpdates,
                      timestamp: Date.now()
                    };
                  }

                  // Combine existing attachments with research progress
                  const attachments = [
                    ...(assistantMessage.experimental_attachments ?? []),
                    ...(researchProgressAttachment ? [researchProgressAttachment] : [])
                  ];

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
              console.log('Error: ', event.error);
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
          // Standard mode (with or without web search)
          // Create the file processor tool with the helper function
          const fileProcessor = processFile({
            session,
            dataStream,
          });

          // Process any files in the messages using the existing tool approach
          const { enhancedSystemPrompt, hasProcessedFiles } =
            await fileProcessor.processMultipleFiles(workingMessages, finalSystemText);

          const result = streamText({
          model,
          system: enhancedSystemPrompt(finalSystemText),
          messages: messagesWithoutFiles(messages),
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : activeToolsList,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
            tools: {
              getWeather,
              createDocument: createDocument({
                session,
                dataStream,
                userMessage,
              }),
              updateDocument: updateDocument({ session, dataStream }),
              requestSuggestions: requestSuggestions({
                session,
                dataStream,
              }),
              processFile: fileProcessor,
              chart: chartTool,
              mapControl: mapControl({
                session,
                dataStream,
              }),
              connector: connectorTool,
              listConnectors: listConnectorsTool,
              ...(webSearch && !deepResearch ? {
                search: search({
                  session,
                  dataStream,
                  app,
                  onTokensUsed: (tokens) => {
                    firecrawlTokens += tokens;
                  },
                }),
                extract: extract({
                  session,
                  dataStream,
                  app,
                  onTokensUsed: (tokens) => {
                    firecrawlTokens += tokens;
                  },
                }),
                scrape: scrape({
                  session,
                  dataStream,
                  app,
                  onTokensUsed: (tokens) => {
                    firecrawlTokens += tokens;
                  },
                }),
              } : {}),
            },
          toolChoice: hasProcessedFiles ? 'none' : 'auto',
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
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      // selectedFiles removed
                      // annotations removed
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

          result.consumeStream();

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
