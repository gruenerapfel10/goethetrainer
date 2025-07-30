import type { UIMessage } from 'ai';

import { generateUUID } from '@/lib/utils';
import { saveMessages } from '@/lib/db/queries';
import { BedrockAgentClient } from '@/lib/bedrock/bedrock-client';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { calculateCost } from '@/lib/costs';
import type {AgentMeta} from "@/app/(chat)/api/chat/agent.type";

const bedrockClient = new BedrockAgentClient();

function prepareResponseText(text: string): string {
  const hasCitations = /\[\d+\]/g.test(text);
  const hasSources = text.includes('**Sources**');

  if (hasCitations && !hasSources) {
    return `${text}\n\n**Sources**\nNo source information available`;
  }

  return text;
}

async function invokeWithRetry(
  input: string,
  systemPrompt: string,
  sessionId: string,
): Promise<{
  text: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}> {
  const maxRetries = 2;
  const delayMs = 1000;
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // If system prompt is set, add it to the input
  // const combinedInput = systemPrompt
  //   ? `${systemPrompt}\n\nUser Query: ${input}`
  //   : input;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const { text, usage } = await bedrockClient.invoke({
        input: input,
        sessionId,
      });

      return { text, usage };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('resuming after being auto-paused') &&
        attempt <= maxRetries
      ) {
        await delay(delayMs);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export const streamSharePointAgent = async (
  agentMeta: AgentMeta,
  messages: UIMessage[],
  id: string,
  selectedChatModel: string,
) => {
  const { content: input } = messages[messages.length - 1];

  const {
    session,
    userMessage,
    titleInputTokens,
    titleOutputTokens,
  } = agentMeta;

  // Get system prompt, default is empty string for sharepoint-agent
  const systemText = await getSystemPrompt('sharepoint-assistant');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            `2:[{"type":"user-message-id","content":"${userMessage.id}"}]\n`,
          ),
        );

        const assistantMessageId = generateUUID();
        let accumulatedResponse = '';

        // Use system prompt when invoking
        const { text, usage } = await invokeWithRetry(input, systemText, id);

        const preparedText = prepareResponseText(text);
        const chunks = preparedText.split(/\n/);
        for (const chunk of chunks) {
          const chunkWithNewline = `${chunk}\n`;
          accumulatedResponse += chunkWithNewline;
          controller.enqueue(
            encoder.encode(`0:${JSON.stringify(chunkWithNewline)}\n`),
          );
        }



        // Send completion events
        controller.enqueue(
          encoder.encode(`e:${JSON.stringify({ finishReason: 'stop' })}\n`),
        );
        controller.enqueue(
          encoder.encode(`d:${JSON.stringify({ finishReason: 'stop' })}\n`),
        );

        // Save the assistant message
        if (session.user?.id) {
          // Track cost for the legacy sharepoint agent
          const modelId = 'anthropic.claude-3-5-sonnet-20240620-v1:0'; // legacy agent model
          const cost = calculateCost(modelId, (usage?.inputTokens ?? 0), (usage?.outputTokens ?? 0));
          
          console.log(`Legacy SharePoint Agent Cost: $${cost?.toFixed(6) ?? 'N/A'}`);

          // Send cost annotation to frontend (similar to sharepoint-agent-v2)
          const costData = {
            toolName: 'legacy_sharepoint_agent',
            modelId: modelId,
            inputTokens: (usage?.inputTokens ?? 0) + titleInputTokens,
            outputTokens: (usage?.outputTokens ?? 0) + titleOutputTokens,
            cost: cost,
          };

          // Send cost annotation via the stream
          controller.enqueue(
            encoder.encode(`2:[{"type":"cost_update","data":${JSON.stringify(costData)}}]\n`)
          );

          await saveMessages({
            messages: [
              {
                id: assistantMessageId,
                chatId: id,
                role: 'assistant',
                createdAt: new Date(),
                parts: [
                  {
                    type: 'text',
                    text: accumulatedResponse.trim(),
                  },
                ],
                attachments: [],
                // selectedFiles removed
                // annotations removed
                useCaseId: null,
                agentType: selectedChatModel,
                //since the model attached to agent is set in aws bedrock, we hardcoded it here - might be needed to adjust later
                modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
                inputTokens: (usage?.inputTokens ?? 0) + titleInputTokens,
                outputTokens: (usage?.outputTokens ?? 0) + titleOutputTokens,
                processed: false,
              },
            ],
          });
        }

        controller.enqueue(
          encoder.encode(
            `8:[{"messageIdFromServer":"${assistantMessageId}"}]\n`,
          ),
        );

        controller.close();
      } catch (error) {
        console.error('Error in stream:', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream);
};
