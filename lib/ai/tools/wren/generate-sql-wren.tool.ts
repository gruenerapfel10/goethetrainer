import {type UIMessageStreamWriter, tool} from 'ai';
import { z } from 'zod/v3';
import {streamGenerateSql} from "@/lib/wren/stream-api/wren.stream-api";
import {type StateEvent, WrenStreamStateEnum} from "@/lib/wren/stream-api/wren.stream-api.types";
import {generateUUID} from "@/lib/utils";
import {fetchDbMetadata} from "@/lib/wren/wren.api";
import {calculateApproximateTokenUsageByWren} from "@/lib/ai/tools/wren/utils";


export const generateSqlWrenTool = (
    { dataStream, onTokenUsageUpdate }: { dataStream: UIMessageStreamWriter, onTokenUsageUpdate?: (tokenUsage: { inputTokens: number, outputTokens: number }) => void }
) => tool({
  description: 'Converts a natural language question to SQL, runs it, and provides the data. The limit is set to 100 rows',
  inputSchema: z.object({
    question: z.string().describe('The natural language question'),
    language: z.string().describe('Language to be used for the answer'),
  }),
  execute: async ({ question, language }, { toolCallId }) => {
    const stateUpdates: StateEvent['data'][] = [];
    const addStateUpdate = (data: StateEvent['data']) => {
      stateUpdates.push(data);
      dataStream.write({
        'type': 'message-annotations',
        'value': [{ type: 'wren_update', toolCallId, data }]
      });
    }

    try {
      const dbMetadata = await fetchDbMetadata();
      const generateId = () => `wren-update-${generateUUID()}`;
      await new Promise(async (resolve) => {
        await streamGenerateSql({
          question,
          language,
          onStateUpdate(data) {
            addStateUpdate(data);
          },
          onError(data) {
            addStateUpdate(data);
          },
          onMessageStop() {
            resolve(stateUpdates)
          }
        });
      });

      const responseStopUpdate = { state: WrenStreamStateEnum.RESPONSE_STOP, timestamp: Date.now(), id: generateId() };
      addStateUpdate(responseStopUpdate);

      const tokenUsage = calculateApproximateTokenUsageByWren(stateUpdates, JSON.stringify(dbMetadata));
      if (onTokenUsageUpdate) {
        onTokenUsageUpdate(tokenUsage);
      }

      const generatedSqlUpdate = stateUpdates.find((update) => update.state === WrenStreamStateEnum.SQL_GENERATION_SUCCESS);
      return {
        stateUpdates,
        sql: generatedSqlUpdate?.sql ? generatedSqlUpdate.sql : 'Error: No SQL generated',
        success: !!generatedSqlUpdate?.sql
      }

    } catch (error) {
      console.error(`Critical error in generateSqlWrenTool tool:`, error);
      console.log('=== WREN QUERY FAILED ===');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred.',
      };
    }
  },
});
