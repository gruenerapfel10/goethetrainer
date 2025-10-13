import {type UIMessageStreamWriter, tool} from 'ai';
import { z } from 'zod/v3';
import { streamAsk } from "@/lib/wren/stream-api/wren.stream-api";
import {type StateEvent, WrenStreamStateEnum} from "@/lib/wren/stream-api/wren.stream-api.types";
import {generateUUID} from "@/lib/utils";
import {fetchDbMetadata} from "@/lib/wren/wren.api";
import {calculateApproximateTokenUsageByWren} from "@/lib/ai/tools/wren/utils";


export const askWren = (
    { dataStream, onTokenUsageUpdate }: { dataStream: UIMessageStreamWriter, onTokenUsageUpdate?: (tokenUsage: { inputTokens: number, outputTokens: number }) => void }
) => tool({
  description: 'Converts a natural language question to SQL, runs it, and provides insights about the data',
  inputSchema: z.object({
    question: z.string().describe('The natural language question'),
    language: z.string().describe('Language to be used for the answer'),
  }),
  execute: async ({ question, language }, { toolCallId }) => {
    try {
      const dbMetadata = await fetchDbMetadata();
      const generateId = () => `wren-update-${generateUUID()}`;
      const stateUpdates: StateEvent['data'][] = [];
      const addStateUpdate = (data: StateEvent['data']) => {
        stateUpdates.push(data);
        dataStream.write({
          'type': 'message-annotations',
          'value': [{ type: 'wren_update', toolCallId, data }]
        });
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
            dataStream.write({
              'type': 'message-annotations',

              'value': [{
                toolCallId,
                type: 'agent_update',
                data: { state: WrenStreamStateEnum.RESPONSE_DELTA, responseChunk, timestamp: Date.now(), id: generateId() }
              }]
            });
          },
          onContentBlockStop(){
            stateUpdates.push({ state: WrenStreamStateEnum.RESPONSE, response, timestamp: contentBlockStartTimestamp, id: generateId() });
            const responseStopUpdate = { state: WrenStreamStateEnum.RESPONSE_STOP, timestamp: Date.now(), id: generateId() };
            addStateUpdate(responseStopUpdate);
          },
          onMessageStop() {
            const tokenUsage = calculateApproximateTokenUsageByWren(stateUpdates, JSON.stringify(dbMetadata));
            if (onTokenUsageUpdate) {
              onTokenUsageUpdate(tokenUsage);
            }
            resolve(stateUpdates);
          }
        });
      });

    } catch (error) {
      console.error(`Critical error in askWren tool:`, error);
      console.log('=== WREN QUERY FAILED ===');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred.',
      };
    }
  },
});
