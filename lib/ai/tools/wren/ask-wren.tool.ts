import { tool } from 'ai';
import { z } from 'zod';
import { streamAsk } from "@/lib/wren/stream-api/wren.stream-api";
import {type StateEvent, WrenStreamStateEnum} from "@/lib/wren/stream-api/wren.stream-api.types";
import {generateUUID} from "@/lib/utils";
import {calculateApproximateTokenUsageByWren} from "@/lib/ai/tools/wren/utils";


export const askWren = (
    { dataStream, onTokenUsageUpdate }: { dataStream: any, onTokenUsageUpdate?: (tokenUsage: { inputTokens: number, outputTokens: number }) => void }
) => tool({
  description: 'Converts a natural language question to SQL, runs it, and provides insights about the data',
  inputSchema: z.object({
    question: z.string().describe('The natural language question'),
    language: z.string().describe('Language to be used for the answer'),
  }),
  execute: async ({ question, language }, { toolCallId }) => {
    try {
      const generateId = () => `wren-update-${generateUUID()}`;
      const stateUpdates: StateEvent['data'][] = [];
      const addStateUpdate = (data: StateEvent['data']) => {
        stateUpdates.push(data);
        dataStream?.writeMessageAnnotation({ type: 'wren_update', toolCallId, data });
      }

      let contentBlockStartTimestamp = 0; // to properly display the timestamp of the first delta block
      return new Promise(async (resolve) => {
        let response = '';
        await streamAsk({
          question,
          language,
          onStateUpdate(data) {
            addStateUpdate(data);
          },
          onError(data) {
            addStateUpdate(data);
          },
          onContentBlockStart() {
            contentBlockStartTimestamp = Date.now();
          },
          onContentBlockDelta(responseChunk) {
            response += responseChunk;
            dataStream?.writeMessageAnnotation({
              toolCallId,
              type: 'agent_update',
              data: { state: WrenStreamStateEnum.RESPONSE_DELTA, responseChunk, timestamp: Date.now(), id: generateId() }
            });
          },
          onContentBlockStop(){
            stateUpdates.push({ state: WrenStreamStateEnum.RESPONSE, response, timestamp: contentBlockStartTimestamp, id: generateId() });
            const responseStopUpdate = { state: WrenStreamStateEnum.RESPONSE_STOP, timestamp: Date.now(), id: generateId() };
            addStateUpdate(responseStopUpdate);
          },
          onMessageStop() {
            const tokenUsage = calculateApproximateTokenUsageByWren(stateUpdates);
            if (onTokenUsageUpdate) {
              onTokenUsageUpdate(tokenUsage);
            }
            resolve(stateUpdates);
          }
        });
      })

    } catch (error) {
      console.error(`Critical error in askWren tool:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred.',
      };
    }
  },
});
