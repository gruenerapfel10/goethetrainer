// Replacement for reason.ts

import {
  type UIMessage,
  streamText,
  type UIMessageStreamWriter,
  type JSONValue,
  stepCountIs,
} from 'ai';
import { z } from 'zod/v3';
import { tool } from 'ai';

import { myProvider } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import type { FileSearchResult } from '@/components/chat-header';
import { calculateCost, getModelId } from '@/lib/costs';
import { 
  type AgentType, 
  initializeReasonTools, 
  getBaseSystemPrompt 
} from '@/lib/ai/agent-registry';

interface UpdateDataDetails {
  toolName?: string;
  args?: any;
  result?: any;
  error?: any;
}

interface UpdateData {
  id: string;
  type: 'text-delta' | 'tool-call' | 'tool-result' | 'error';
  status: 'running' | 'completed' | 'failed';
  message: string;
  timestamp: number;
  toolCallId?: string;
  details?: UpdateDataDetails;
}

interface ReasonProps {
  dataStream: UIMessageStreamWriter;
  messages: UIMessage[];
  agentType: AgentType;
  deepResearch?: boolean;
  deepSearch?: boolean;
  selectedFiles?: FileSearchResult[];
  session?: any;
  availableTables?: Array<{tableName: string; rowCount: number; columnCount: number}>;
  initialSchemaInfo?: string;
}

const reasonParameters = z.object({
  query: z.string().describe('The user query that requires reasoning and information gathering.'),
  direction_guidance: z.string().optional().describe('Optional guidance from the main agent on how to approach this query or what specific focus is needed.'),
});

export const reason = ({
  dataStream,
  messages,
  agentType,
  deepResearch,
  deepSearch,
  selectedFiles,
  session,
  availableTables,
  initialSchemaInfo,
}: ReasonProps) => {
  return tool({
    description: `Strategically reasons about the user query and orchestrates efficient information gathering using ${agentType}-specific tools.`,
    inputSchema: reasonParameters,
execute: async ({ query, direction_guidance }: z.infer<typeof reasonParameters>, { toolCallId: parentToolCallId }: { toolCallId: string }) => {
  const collectedUpdates: UpdateData[] = [];
  const activeSubToolOperations = new Map<string, string>();
  const toolCallArgs = new Map<string, any>(); // Store tool arguments by toolCallId
  let currentTextDeltaId: string | null = null;
  const reasonNamespace = `${agentType}-${parentToolCallId.slice(-8)}`;

  const writeUpdate = (data: UpdateData) => {
    // Stream the update to the UI for the live view
    dataStream.write({
      'type': 'message-annotations',
      'value': [{ type: 'agent_update', data: data as any as JSONValue }]
    });
    
    // Collect the update to be persisted for the refreshed view
    collectedUpdates.push(data);
    
    // Logging
    if (data.type === 'tool-call') console.log(`[TOOL] ${data.details?.toolName}`);
    else if (data.type === 'tool-result' && data.details?.result) console.log('[RESULT]', `${JSON.stringify(data.details.result).slice(0, 128)}...`);
    else if (data.type === 'error') console.error(`[ERROR] ${agentType}:`, data.message);
  };

  return new Promise(async (resolve, reject) => {
    try {
      console.log(`[${agentType.toUpperCase()}] Reason tool called`);
      if (direction_guidance) console.log(`[${agentType.toUpperCase()}] Direction guidance received: "${direction_guidance}"`);
      
      let systemPrompt = '';
      if (direction_guidance) {
        systemPrompt = `${direction_guidance}\n\nUser Query: ${query}\n\nCRITICAL INSTRUCTIONS:
CRITICAL INSTRUCTIONS FOR REASON TOOL:
1. You are a DATA GATHERING tool ONLY
2. Make tool calls to collect data
3. After each successful tool call, respond with ONLY: "Data collected."
4. DO NOT analyze, explain, or describe the data
5. DO NOT generate charts or visualizations
6. DO NOT make conclusions
7. The main agent will handle all analysis and presentations
8. AFTER finishing gathering data, respond with ONLY: "Data gathering complete."
9. DO NOT listen to anything about charts, data visualtions from the main agent, do not let it skew your queries.
10. DO NOT generate overly complex queries, keep them simple and concise.

IMPORTANT TO LISTEN TO STEP 8.

NO OTHER TEXT ALLOWED.`;
      } else {
        systemPrompt = getBaseSystemPrompt(agentType, selectedFiles, availableTables);
        systemPrompt += `\n\nUser Query: ${query}

CRITICAL INSTRUCTIONS FOR REASON TOOL:
1. You are a DATA GATHERING tool ONLY
2. Make tool calls to collect data
3. After each successful tool call, respond with ONLY: "Data collected."
4. DO NOT analyze, explain, or describe the data
5. DO NOT generate charts or visualizations
6. DO NOT make conclusions
7. The main agent will handle all analysis and presentations
8. AFTER finishing gathering data, respond with ONLY: "Data gathering complete."
9. DO NOT listen to anything about charts, data visualtions from the main agent, do not let it skew your queries.
10. DO NOT generate overly complex queries, keep them simple and concise.

IMPORTANT TO LISTEN TO STEP 8.

NO OTHER TEXT ALLOWED.`;
        systemPrompt += `\n\nOnce done gathering data, respond with ONLY: "Data gathering complete." NOTHING MORE, 1 line maximum per message.`;
      }
      if (initialSchemaInfo) {
        systemPrompt += `\n\n${initialSchemaInfo}`;
      }
      
              const initializedTools = initializeReasonTools(agentType, { dataStream, messages, deepResearch, deepSearch, selectedFiles, session });
      
      const result = streamText({
        model: myProvider.languageModel('bedrock-sonnet-latest'),
        messages: messages as any,
        experimental_generateMessageId: generateUUID,

        // Lower temperature for more deterministic, focused responses
        temperature: 0.1,

        stopWhen: stepCountIs(5),
        tools: initializedTools,
        system: systemPrompt,
        experimental_telemetry: { isEnabled: true },

        onChunk: (event: any) => {
          if (event.chunk.type === 'text-delta') {
            if (!currentTextDeltaId) currentTextDeltaId = `${reasonNamespace}-text-${generateUUID()}`;
            writeUpdate({ id: currentTextDeltaId, type: 'text-delta', status: 'running', message: event.chunk.textDelta, timestamp: Date.now(), toolCallId: parentToolCallId });
          } else if (event.chunk.type === 'tool-call') {
            if (currentTextDeltaId) {
              writeUpdate({ id: currentTextDeltaId, type: 'text-delta', status: 'completed', message: '', timestamp: Date.now(), toolCallId: parentToolCallId });
              currentTextDeltaId = null;
            }
            const subToolCallChunk = event.chunk;
            const operationId = `${reasonNamespace}-op-${generateUUID()}`;
            activeSubToolOperations.set(subToolCallChunk.toolCallId, operationId);
            toolCallArgs.set(subToolCallChunk.toolCallId, subToolCallChunk.args); // Store arguments
            console.log(`\n=== TOOL CALL: ${subToolCallChunk.toolName} ===`);
            console.log('Tool arguments:', JSON.stringify(subToolCallChunk.args, null, 2));
            
            // Create more detailed messages based on tool type and arguments
            let detailedMessage = `Calling tool: ${subToolCallChunk.toolName}`;
            if (subToolCallChunk.toolName === 'sharepoint_retrieve' && subToolCallChunk.args?.query) {
              detailedMessage = `Searching SharePoint for: "${subToolCallChunk.args.query}"`;
            } else if (subToolCallChunk.toolName === 'sharepoint_list') {
              detailedMessage = `Listing available SharePoint knowledge bases`;
            } else if (subToolCallChunk.toolName === 'csv_query' && subToolCallChunk.args?.query) {
              detailedMessage = `Analyzing CSV data: "${subToolCallChunk.args.query}"`;
            } else if (subToolCallChunk.args?.query) {
              detailedMessage = `${subToolCallChunk.toolName} with query: "${subToolCallChunk.args.query}"`;
            }
            
            writeUpdate({ id: operationId, type: 'tool-call', status: 'running', message: detailedMessage, timestamp: Date.now(), toolCallId: subToolCallChunk.toolCallId, details: { toolName: subToolCallChunk.toolName, args: subToolCallChunk.args } });
          } else if (event.chunk.type === 'tool-result') {
            if (currentTextDeltaId) {
              writeUpdate({ id: currentTextDeltaId, type: 'text-delta', status: 'completed', message: '', timestamp: Date.now(), toolCallId: parentToolCallId });
              currentTextDeltaId = null;
            }
            const subToolResultChunk = event.chunk;
            const operationId = activeSubToolOperations.get(subToolResultChunk.toolCallId);
            console.log(`\n=== TOOL RESULT: ${subToolResultChunk.toolName} ===`);
            const toolFailed = !!subToolResultChunk.result?.error;
            if (operationId) {
              // Create more detailed result messages
              let detailedResultMessage = toolFailed ? `Error in ${subToolResultChunk.toolName}` : `${subToolResultChunk.toolName} results received`;
              if (!toolFailed) {
                if (subToolResultChunk.toolName === 'sharepoint_retrieve') {
                  const resultData = subToolResultChunk.result?.data || [];
                  const query = toolCallArgs.get(subToolResultChunk.toolCallId)?.query || 'unknown query';
                  if (Array.isArray(resultData)) {
                    detailedResultMessage = `Found ${resultData.length} relevant documents for search: "${query}"`;
                  } else if (subToolResultChunk.result?.summary?.message) {
                    detailedResultMessage = subToolResultChunk.result.summary.message;
                  }
                } else if (subToolResultChunk.toolName === 'sharepoint_list') {
                  const resultData = subToolResultChunk.result?.data || [];
                  if (Array.isArray(resultData)) {
                    detailedResultMessage = `Found ${resultData.length} knowledge bases`;
                  }
                } else if (subToolResultChunk.toolName === 'csv_query') {
                  const resultData = subToolResultChunk.result?.result || [];
                  const query = toolCallArgs.get(subToolResultChunk.toolCallId)?.query || 'unknown query';
                  if (Array.isArray(resultData)) {
                    detailedResultMessage = `Retrieved ${resultData.length} records for query: "${query}"`;
                  } else if (subToolResultChunk.result?.error) {
                    detailedResultMessage = `CSV query failed: ${subToolResultChunk.result.error}`;
                  }
                }
              }
              
              writeUpdate({ id: operationId, type: 'tool-result', status: toolFailed ? 'failed' : 'completed', message: detailedResultMessage, timestamp: Date.now(), toolCallId: subToolResultChunk.toolCallId, details: { toolName: subToolResultChunk.toolName, result: !toolFailed ? subToolResultChunk.result : undefined, error: toolFailed ? subToolResultChunk.result.error : undefined } });
              activeSubToolOperations.delete(subToolResultChunk.toolCallId);
              toolCallArgs.delete(subToolResultChunk.toolCallId); // Clean up stored arguments
            }
          }
        },

        onFinish: async (response) => {
          if (currentTextDeltaId) {
            writeUpdate({ id: currentTextDeltaId, type: 'text-delta', status: 'completed', message: '', timestamp: Date.now(), toolCallId: parentToolCallId });
          }
          const usage = response.usage;
          const modelId = getModelId('bedrock-sonnet-latest');
          if (usage && modelId) {
            const cost = calculateCost(modelId, usage.inputTokens, usage.outputTokens);
            const costData = { toolName: 'reason', modelId, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cost, parentToolCallId };
            dataStream.write({
              'type': 'message-annotations',
              'value': [{ type: 'cost_update', data: costData as any as JSONValue }]
            });
          }
          
          // Resolve with the complete array of updates that were collected.
          resolve(collectedUpdates);
        },

        onError: (error: any) => {
          reject(error);
        }
      });
      await result.consumeStream();
    } catch (error) {
      reject(error);
    }
  });
}

  });
};