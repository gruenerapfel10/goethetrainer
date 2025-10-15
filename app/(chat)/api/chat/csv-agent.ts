// app/api/chat/csv-agent.ts
import {
  createUIMessageStreamResponse,
  streamText,
  smoothStream,
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
          messages: originalMessages,

          transform: smoothStream({
            chunking: 'word',
            delayInMs: 15,
          }),

          temperature: 0,
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

        });
        result.consumeStream();
        return result.mergeIntoUIMessageStream(dataStream, {
          sendReasoning: true,
        });
      },
    });
}
