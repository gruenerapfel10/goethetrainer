import {appendResponseMessages, createDataStreamResponse, streamText, type UIMessage,} from 'ai';
import type {AgentMeta} from "@/app/(chat)/api/chat/agent.type";
import {generateUUID, getTrailingMessageId, messagesWithoutFiles} from "@/lib/utils";
import {calculateCost} from "@/lib/costs";
import {saveMessages} from "@/lib/db/queries";
import {AgentType, initializeRegularTools} from "@/lib/ai/agent-registry";
import {fetchDbMetadata} from "@/lib/wren/wren.api";
import type {WrenFetchMetadataResponse} from "@/lib/wren/wren.api.types";
import {generateSqlWrenTool} from "@/lib/ai/tools/wren/generate-sql-wren.tool";
import {runSqlWrenTool} from "@/lib/ai/tools/wren/run-sql-wren.tool";


const getBaseSystemPrompt = (userQuery: string, dbMetadata: WrenFetchMetadataResponse) => {
    return `You are an assistant that helps users retrieve information from a database using natural language. You have access to two tools:
1. Tool: text2sql - a specialized AI agent for converting natural language questions into SQL queries.
        It is aware of the database schema and can generate SQL queries based on the questions. It can generate only one query per call.
    Input: a natural language question (e.g. what should be fetched from the database); 
    Output: a JSON object in the format:
    {
      "stateUpdates": [...],
      "sql": "SQL_QUERY_STRING or error message",
      "success": true | false
    }
    Use only the sql field when success is true.
    If success is false, do not call any other tools. Instead, tell the user that the query could not be generated.

2. Tool: run_sql
    Input: a valid SQL query string.
    Output: the result of executing that query on the database.

Workflow:
If the user's question requires querying the database:
Call text2sql with the question.
If success is true, extract the sql field and pass it exactly as is to run_sql.
If success is false, do not proceed further and tell the user: "The SQL query could not be generated." (or a similar appropriate response).
Use the result from run_sql to answer the user's question in natural language.
If the query result is empty (no rows), respond with something like: "No data was found matching your request."
If the user's request does not require database access, answer directly without using any tools.

Strict Prohibitions:
Do not invent, guess, or assume any data. Only use facts explicitly returned by run_sql.
Never modify or generate SQL manually. Use only the SQL returned by text2sql.
Do not proceed to run_sql unless text2sql returned success: true.
Do not fabricate answers when data is missing — if the result lacks required values, clearly say so.

Current date and time: ${new Date().toISOString()}
  
DB Metadata: ${JSON.stringify(dbMetadata)}

User Query: ${userQuery}
  
If the above query is not related to data analysis, tell the user "I'm sorry, I can only help with data analysis and related tasks."
  `
}

// to reduce token usage, we clear tool invocation parts that are not run_sql
const clearRedundantToolInvocationsFromMessages = (messages: Array<UIMessage>) => {
    return messages.map(message => {
        if (message.role === 'assistant' && message.parts) {
            return {
                ...message,
                parts: message.parts.filter(part => {
                    if (part.type === 'tool-invocation' && part.toolInvocation.toolName !== 'run_sql') {
                        return false;
                    }
                    return true;
                }),
            };
        }
        return message;
    });
}


export async function streamText2SqlAgent(
    agentMeta: AgentMeta,
    messages: Array<UIMessage>,
    id: string,
    selectedChatModel: string
) {
    const { content: userQuery } = messages[messages.length - 1];
    const {
        session,
        userMessage,
        model,
        titleOutputTokens,
        titleInputTokens,
    } = agentMeta;


    return createDataStreamResponse({
        async execute(dataStream) {
            const wrenTokenUsage: { inputTokens: number, outputTokens: number }[] = [];
            const sanitizedMessages = messagesWithoutFiles(clearRedundantToolInvocationsFromMessages(messages));
            const regularTools = initializeRegularTools(AgentType.TEXT2SQL_AGENT, {
                dataStream,
                messages: sanitizedMessages,
                session
            });

            const dbMetadata = await fetchDbMetadata();
            const agentStream = streamText({
                model,
                messages: sanitizedMessages,
                experimental_generateMessageId: generateUUID,
                temperature: 0.5,
                maxSteps: 5,
                experimental_telemetry: { isEnabled: true },
                tools: {
                    text2sql: generateSqlWrenTool({
                        dataStream,
                        onTokenUsageUpdate(usage) {
                            wrenTokenUsage.push(usage);
                        }
                    }),
                    run_sql: runSqlWrenTool,
                    ...regularTools,
                },
                system: getBaseSystemPrompt(userQuery, dbMetadata),
                onFinish: async ({ response, usage }) => {
                    const assistantId = getTrailingMessageId({
                        messages: response.messages.filter(
                            (message) => message.role === 'assistant',
                        ),
                    });

                    if (!assistantId) {
                        console.error('text2sql error: No assistant message found in main agent stream response!');
                        return;
                    }

                    const totalWrenTokenUsage = wrenTokenUsage.reduce((memo, current) => {
                        return {
                            inputTokens: memo.inputTokens + current.inputTokens,
                            outputTokens: memo.outputTokens + current.outputTokens,
                        }
                    }, { inputTokens: 0, outputTokens: 0 })

                    if (usage) {
                        const cost = calculateCost(model.modelId, usage.promptTokens + totalWrenTokenUsage.inputTokens, usage.completionTokens + totalWrenTokenUsage.outputTokens);
                        const costData = {
                            toolName: selectedChatModel,
                            modelId: model.modelId,
                            inputTokens: usage.promptTokens + totalWrenTokenUsage.inputTokens,
                            outputTokens: usage.completionTokens + totalWrenTokenUsage.outputTokens,
                            cost,
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

                    await saveMessages({
                        messages: [
                            {
                                id: assistantId,
                                chatId: id,
                                role: assistantMessage.role,
                                createdAt: new Date(),
                                parts: formattedParts,
                                attachments: [],//userMessageAttachments,
                                useCaseId: null,
                                agentType: selectedChatModel,
                                modelId: model.modelId,
                                inputTokens: (usage?.promptTokens ?? 0) + titleInputTokens + totalWrenTokenUsage.inputTokens,
                                outputTokens: (usage?.completionTokens ?? 0) + titleOutputTokens + totalWrenTokenUsage.outputTokens,
                                processed: false,
                            },
                        ],
                    });
                },
                onError: (error) => {
                    console.error('text2sql agent: Error in main agent stream', error);
                },
            });

            return agentStream.mergeIntoDataStream(dataStream);
        }
    })




}