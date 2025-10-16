import { tool } from 'ai';
import { z } from 'zod';
import {streamGenerateSql} from "@/lib/wren/stream-api/wren.stream-api";
import {type StateEvent, WrenStreamStateEnum} from "@/lib/wren/stream-api/wren.stream-api.types";
import {generateUUID} from "@/lib/utils";
import {calculateApproximateTokenUsageByWren} from "@/lib/ai/tools/wren/utils";


export const generateSqlWrenTool = () => tool({
  description: 'Converts a natural language question to SQL',
  inputSchema: z.object({
    question: z.string().describe('The natural language question'),
    language: z.string().describe('Language to be used for the answer'),
  }),
  execute: async ({ question, language }, { toolCallId, dataStream, onTokenUsageUpdate }: any = {}) => {
    const stateUpdates: StateEvent['data'][] = [];
    const addStateUpdate = (data: StateEvent['data']) => {
      stateUpdates.push(data);
      dataStream?.writeMessageAnnotation({ type: 'wren_update', toolCallId, data });
    }

    try {
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

      const tokenUsage = calculateApproximateTokenUsageByWren(stateUpdates);
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred.',
      };
    }
  },
});
