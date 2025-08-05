// app/api/chat/csv-agent.ts
import {
  createDataStreamResponse,
  streamText,
  smoothStream,
  appendResponseMessages,
} from 'ai';
import { getTrailingMessageId, messagesWithoutFiles } from '@/lib/utils';
import { myProvider } from '@/lib/ai/models';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { csvAnalyze } from '@/lib/ai/tools/csv-analyze';
// Database import using stub function (no persistence)
import { saveMessages } from '@/lib/db/queries-stub';
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

    return createDataStreamResponse({
      execute: async (dataStream) => {
        const result = streamText({
          model: model,
          maxSteps: 2,
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
                      inputTokens:
                        (usage?.promptTokens ?? 0) + titleInputTokens,
                      outputTokens:
                        (usage.completionTokens ?? 0) + titleOutputTokens,
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
          },
        });
        result.consumeStream();
        return result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
    });
}
