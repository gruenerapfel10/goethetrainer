// app/api/chat/csv-agent.ts
import {
  createUIMessageStreamResponse,
  streamText,
  smoothStream,
  appendResponseMessages,
  stepCountIs,
} from 'ai';
import { getTrailingMessageId, messagesWithoutFiles } from '@/lib/utils';
import { myProvider } from '@/lib/ai/models';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { csvAnalyze } from '@/lib/ai/tools/csv-analyze';
// Using Firebase instead of PostgreSQL
import { saveMessages } from '@/lib/firebase/chat-service';
import { generateUUID } from '@/lib/utils';
import type {AgentMeta} from "@/app/(chat)/api/chat/agent.type";

export async function streamCsvAgent(agentMeta: AgentMeta, json: any) {
  const {
    id,
    messages: originalMessages,
    selectedChatModel,
  }: { id: string; messages: any; selectedChatModel: string } = json;

  const {
    session,
    userMessage,
    titleInputTokens,
    titleOutputTokens,
  } = agentMeta;

    const model = myProvider.languageModel('bedrock-sonnet-latest');
    const systemText = await getSystemPrompt('csv-agent');

    return createUIMessageStreamResponse({
      execute: async (dataStream) => {
        const result = streamText({
          model: model,
          stopWhen: stepCountIs(2),
          messages: messagesWithoutFiles(originalMessages),

          experimental_transform: smoothStream({
            chunking: 'word',
            delayInMs: 15,
          }),

          experimental_generateMessageId: generateUUID,
          temperature: 0,
          experimental_activeTools: ['reason_csv'],
          system: systemText,

          tools: {
            reason_csv: csvAnalyze({
              session,
              dataStream,
            }),
          },

          onChunk(event) {
            if (event.chunk.type === 'tool-call') {
              console.log('Called Tool: ', event.chunk.toolName);
            }
          },

          onStepFinish(event) {
            if (event.warnings) {
              console.log('Warnings: ', event.warnings);
            }
          },

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

                /* FIXME(@ai-sdk-upgrade-v5): The `appendResponseMessages` option has been removed. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#message-persistence-changes */
                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                /* FIXME(@ai-sdk-upgrade-v5): The `experimental_attachments` property has been replaced with the parts array. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#attachments--file-parts */
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
                      inputTokens:
                        (usage?.inputTokens ?? 0) + titleInputTokens,
                      outputTokens:
                        (usage.outputTokens ?? 0) + titleOutputTokens,
                      processed: false,
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },

          onError(event) {
            console.log('Error: ', event.error);
          },

          experimental_telemetry: {
            isEnabled: true,
            functionId: 'stream-text',
          }
        });
        result.consumeStream();
        return result.mergeIntoUIMessageStream(dataStream, {
          sendReasoning: true,
        });
      },
    });
}
