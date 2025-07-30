import {appendResponseMessages, createDataStreamResponse, streamText, type UIMessage} from 'ai';

import {generateUUID, getTrailingMessageId, messagesWithoutFiles} from '@/lib/utils';
import {executeCsvQuery, listCsvTables, saveMessages} from '@/lib/db/queries';
import {myProvider} from '@/lib/ai/models';
import {reason} from '@/lib/ai/tools/reason';
import {calculateCost} from '@/lib/costs';
import {AgentType, initializeRegularTools} from '@/lib/ai/agent-registry';
import type {AgentMeta} from "@/app/(chat)/api/chat/agent.type";

// Replacement for streamCsvAgent in csv-agent-v2.ts

export const streamCsvAgent = async (
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

    return createDataStreamResponse({
        execute: async (dataStream) => {
            try {
                // --- NEW: Pre-fetch schema and sample data ---
                let initialSchemaInfo = "No table information could be pre-fetched.";
                let availableTablesList: Array<{ tableName: string; rowCount: number; columnCount: number }> = [];

                try {
                    availableTablesList = await listCsvTables();
                    if (availableTablesList.length > 0) {
                        const schemaPromises = availableTablesList.map(async (table) => {
                            const sampleQuery = `SELECT * FROM "${table.tableName}" LIMIT 5`;
                            const sampleData = await executeCsvQuery(sampleQuery);
                            const columns = sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
                            const sampleDataString = JSON.stringify(sampleData, null, 2);

                            return `Table: "${table.tableName}" (${table.rowCount} rows, ${columns.length} columns)\nColumns: ${columns.join(', ')}\nSample Rows:\n${sampleDataString}\n---`;
                        });

                        const schemas = await Promise.all(schemaPromises);
                        initialSchemaInfo = `PRE-FETCHED TABLE SCHEMA (You already have this information):\n\n${schemas.join('\n')}`;
                    }
                } catch (error) {
                    console.error('Error pre-fetching table schemas:', error);
                    initialSchemaInfo = "Error pre-fetching table schemas. The agent may need to explore manually.";
                }
                // --- END OF NEW LOGIC ---

                console.log('Initial Schema Info provided to agent:', initialSchemaInfo);

                const baseSystemPrompt = `You are an AI assistant specializing in analyzing CSV data and providing comprehensive insights using SQL queries and beautiful chart visualizations. 
  
  WORKFLOW:
  1.  For CSV data analysis queries, use the 'reason' tool to gather information and execute queries.
  2.  Once you have sufficient data from the reason tool, provide a comprehensive final answer.
  3.  DO NOT call the reason tool repeatedly - one thorough analysis is usually sufficient.
  4. PLEASE FOR THE LOVE OF GOD, USE THE LEAST TOOL USAGE AS POSSIBLE.
  5. AIM TO OUTPUT A SUCCINCT ANSWER
  6. USE MARKDOWN TABLES AS MUCH AS POSSIBLE TO VISUALISE THE DATA FOR THE USER.
  7. WHEN APPROPRIATE, CREATE BEAUTIFUL CHARTS to visualize data patterns, trends, and insights.

CHART GENERATION:
- You have DIRECT ACCESS to the 'chart' tool at the main agent level (not inside the reason tool)
- Use charts when data shows patterns, trends, comparisons, or distributions
- Choose appropriate chart types: line (trends), bar (comparisons), pie (proportions), area (cumulative), radar (multi-dimensional), scatter (correlations)
- Call the chart tool directly after gathering data through the reason tool
- The chart tool uses shadcn/ui components for beautiful, interactive visualizations
- REASONING TOOL CANNOT DO THIS.
- Do not make too many charts, only one or two, aim to make charts as easy to understand as possible whilst detailing the data.
- Do not overuse charts, only when you think it is appropriate.

First identify how many queries you will need and why, each query must be ABSOLUTELY necessary.

We cannot afford to waste resources.

LEAST TOOL USAGE AS POSSIBLE, PLEASE.
  
  USING THE REASON TOOL:
  -   You MUST ALWAYS provide direction_guidance to help the reason tool understand exactly what you want; always tell him to use as least tool usage as possible.
  -   You have already been provided with the schema and sample rows for the available tables. DO NOT run a query to get this information again. Start your analysis directly.
  -   Keep direction_guidance as short as possible, its meant to steer not dictate.
  -   Reason tool CANNOT make charts, or call any tools you can call.
  
  CRITICAL: ALWAYS provide direction_guidance when calling the reason tool.
  
  User Query: ${input}
  
  If the above query is not related to data analysis or CSV processing, tell the user "I'm sorry, I can only help with CSV data analysis and related tasks."
  `;

                // Get regular tools (chart tool) for main agent
                const regularTools = initializeRegularTools(AgentType.CSV_AGENT_V2, {
                    dataStream,
                    messages: messagesWithoutFiles(messages) as any,
                    session
                });

                const mainAgentResult = streamText({
                    model: myProvider.languageModel('bedrock-sonnet-latest'),
                    messages: messagesWithoutFiles(messages) as any,
                    experimental_generateMessageId: generateUUID,
                    temperature: 0.7,
                    maxSteps: 5,
                    experimental_telemetry: { isEnabled: true },
                    tools: {
                        reason: reason({
                            dataStream,
                            messages: messagesWithoutFiles(messages) as any,
                            agentType: AgentType.CSV_AGENT_V2,
                            session,
                            availableTables: availableTablesList,
                            // --- NEW: Pass the pre-fetched info to the reason tool ---
                            initialSchemaInfo: initialSchemaInfo,
                        }),
                        ...regularTools, // Add chart tool at main agent level
                    },
                    system: baseSystemPrompt,
                    onFinish: async ({ response, usage }) => {
                        const assistantId = getTrailingMessageId({
                            messages: response.messages.filter(
                                (message) => message.role === 'assistant',
                            ),
                        });

                        if (!assistantId) {
                            console.error('streamCsvAgent: No assistant message found in main agent stream response!');
                            return;
                        }

                        if (usage) {
                            const modelId = 'eu.anthropic.claude-sonnet-4-20250514-v1:0';
                            const cost = calculateCost(modelId, usage.promptTokens, usage.completionTokens);
                            const costData = {
                                toolName: 'csv_main_agent', modelId, inputTokens: usage.promptTokens,
                                outputTokens: usage.completionTokens, cost,
                            };
                            dataStream.writeMessageAnnotation({ type: 'cost_update', data: costData as any });
                        }

                        const [, assistantMessage] = appendResponseMessages({
                            messages: [userMessage],
                            responseMessages: response.messages,
                        });

                        const formattedParts = (assistantMessage.parts ?? []).map(part =>
                            typeof part === 'string' ? { type: 'text', text: part } : part
                        );

                        if (formattedParts.length === 0) {
                            formattedParts.push({ type: 'text', text: 'CSV analysis completed.' });
                        }

                        if (session.user?.id) {
                            await saveMessages({
                                messages: [
                                    {
                                        id: assistantId, chatId: id, role: assistantMessage.role,
                                        createdAt: new Date(), parts: formattedParts, attachments: assistantMessage.experimental_attachments ?? [],
                                        // selectedFiles removed // annotations removed
                                        useCaseId: null, agentType: selectedChatModel,
                                        modelId: myProvider.languageModel('bedrock-sonnet-latest').modelId,
                                        inputTokens: (usage?.promptTokens ?? 0) + titleInputTokens,
                                        outputTokens: (usage?.completionTokens ?? 0) + titleOutputTokens,
                                        processed: false,
                                    },
                                ],
                            });
                        }
                    },
                    onError: (error) => {
                        console.error('streamCsvAgent: Error in main agent stream', error);
                        dataStream.writeMessageAnnotation({
                            type: 'csv_update', data: {
                                id: generateUUID(), type: 'error', status: 'failed',
                                message: `Overall process failed: ${error instanceof Error ? error.message : String(error)}`,
                                timestamp: Date.now(), toolCallId: generateUUID(),
                                details: { error: error instanceof Error ? error.message : String(error) },
                            },
                        });
                    },
                });

                return mainAgentResult.mergeIntoDataStream(dataStream);

            } catch (error) {
                console.error('streamCsvAgent: Error during stream setup', error);
                dataStream.writeMessageAnnotation({
                    type: 'csv_update', data: {
                        id: generateUUID(), type: 'error', status: 'failed',
                        message: `Analysis setup failed: ${error instanceof Error ? error.message : String(error)}`,
                        timestamp: Date.now(), toolCallId: generateUUID(),
                        details: { error: error instanceof Error ? error.message : String(error) },
                    },
                });
            }
        },
    });
};