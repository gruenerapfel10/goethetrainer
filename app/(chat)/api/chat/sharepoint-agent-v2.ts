import {
    appendResponseMessages,
    createUIMessageStreamResponse,
    streamText,
    type UIMessage,
    stepCountIs,
} from 'ai';

import {generateUUID, getTrailingMessageId, messagesWithoutFiles} from '@/lib/utils';
import {saveMessages} from '@/lib/firebase/chat-service';
import {myProvider} from '@/lib/ai/models';
import {reason} from '@/lib/ai/tools/reason';
import type {FileSearchResult} from '@/components/chat-header';
import {calculateCost} from '@/lib/costs';
import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";
import type {Readable} from 'node:stream';
import {AgentType, initializeRegularTools} from '@/lib/ai/agent-registry';
import type {AgentMeta} from "@/app/(chat)/api/chat/agent.type";
import { addToolConstraints } from '@/lib/utils/message-filter';

// S3 client for fetching full file content on demand
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// Helper function to detect file type
function getFileType(fileName: string): 'pdf' | 'text' | 'unknown' {
    const extension = fileName.toLowerCase().split('.').pop();
    
    if (extension === 'pdf') return 'pdf';
    
    const textExtensions = ['txt', 'md', 'json', 'csv', 'xml', 'html', 'htm', 'log', 'yml', 'yaml'];
    if (extension && textExtensions.includes(extension)) return 'text';
    
    return 'unknown';
}

// Convert PDF buffer to markdown-formatted text
async function convertPDFToMarkdown(pdfBuffer: Buffer, fileName: string): Promise<string> {
    try {
        // Dynamic import to avoid loading the library unless needed
        // Using a fork that fixes the ENOENT error
        // @ts-ignore
        const pdfParse = (await import('pdf-parse-debugging-disabled')) as any;
        const data = await pdfParse.default(pdfBuffer);
        
        // Format the extracted text as markdown
        let markdown = `# ${fileName}\n\n`;
        markdown += `**Pages:** ${data.numpages}\n\n`;
        markdown += `**Content:**\n\n`;
        
        // Clean up the text and format it nicely
        const cleanedText = data.text
            .replace(/\n\s*\n/g, '\n\n') // Normalize multiple newlines
            .replace(/(\n{3,})/g, '\n\n') // Limit to max 2 newlines
            .trim();
        
        markdown += cleanedText;
        
        // Add metadata if available
        if (data.info) {
            markdown += '\n\n---\n\n**Document Information:**\n';
            if (data.info.Title) markdown += `- Title: ${data.info.Title}\n`;
            if (data.info.Author) markdown += `- Author: ${data.info.Author}\n`;
            if (data.info.Subject) markdown += `- Subject: ${data.info.Subject}\n`;
            if (data.info.Creator) markdown += `- Creator: ${data.info.Creator}\n`;
            if (data.info.Producer) markdown += `- Producer: ${data.info.Producer}\n`;
            if (data.info.CreationDate) markdown += `- Creation Date: ${data.info.CreationDate}\n`;
        }
        
        return markdown;
    } catch (error) {
        console.error(`Error parsing PDF ${fileName}:`, error);
        // Return a fallback message with error details
        return `# ${fileName}\n\n**Error:** Failed to extract content from PDF.\n\nDetails: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}

async function getS3FileContent(s3Url: string): Promise<string> {
    try {
        const urlParts = s3Url.replace('s3://', '').split('/');
        const bucketName = urlParts[0];
        const key = urlParts.slice(1).join('/');

        if (!bucketName || !key) {
            console.warn(`Invalid S3 URL format for content retrieval: ${s3Url}`);
            return '';
        }

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        const response = await s3Client.send(command);
        const stream = response.Body as Readable;

        if (!stream) {
            console.warn(`No content stream for S3 object: ${s3Url}`);
            return '';
        }

        // Collect the stream into a buffer
        const chunks: Uint8Array[] = [];
        await new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', resolve);
        });
        
        const buffer = Buffer.concat(chunks);
        const fileName = key.split('/').pop() || 'document';
        const fileType = getFileType(fileName);
        
        // Handle different file types
        switch (fileType) {
            case 'pdf':
                console.log(`Processing PDF file: ${fileName}`);
                return await convertPDFToMarkdown(buffer, fileName);
                
            case 'text':
                console.log(`Processing text file: ${fileName}`);
                return buffer.toString('utf-8');
                
            default:
                console.warn(`Unsupported file type for ${fileName}`);
                return `[Binary file: ${fileName} - Content cannot be displayed]`;
        }
        
    } catch (error) {
        console.error(`Error fetching full content from S3 for ${s3Url}:`, error);
        return '';
    }
}

function calculateAccurateTotalPromptTokens(
    baseSystemPrompt: string,
    messages: UIMessage[],
    files?: FileSearchResult[]
): number {
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    let totalTokens = estimateTokens(baseSystemPrompt);

    messages.forEach(msg => {

        if (typeof msg.content === 'string') {
            totalTokens += estimateTokens(msg.content);
        }
    });

    if (files && files.length > 0) {
        files.forEach(file => {
            console.log(`file content ${file.content}`);
            totalTokens += estimateTokens(file.content);
        });
    }

    return totalTokens;
}

export const streamSharePointAgent = async (
    agentMeta: AgentMeta,
    messages: UIMessage[],
    id: string,
    selectedChatModel: string,
    deepSearch?: boolean,
    selectedFiles?: FileSearchResult[],
) => {
    const { content: input } = messages[messages.length - 1];

    const {
        session,
        userMessage,
        titleInputTokens,
        titleOutputTokens,
    } = agentMeta;

    return createUIMessageStreamResponse({
        execute: async (dataStream) => {
            try {
                // Process selected files and determine content handling strategy
                const TOKEN_THRESHOLD = 150000;
                const totalTokens = calculateAccurateTotalPromptTokens(input, messages, selectedFiles);
                let attachedFilesInfo = '';
                let shouldUseReason = true;

                console.log(`totalTokens: ${totalTokens}`);

                if (selectedFiles && selectedFiles.length > 0) {
                    if (totalTokens < TOKEN_THRESHOLD) {
                        const hydratedFiles = await Promise.all(
                            selectedFiles.map(async file => {
                                if (file.url.startsWith('s3://')) {
                                    const fullContent = await getS3FileContent(file.url);
                                    return { ...file, content: fullContent };
                                }
                                return file;
                            })
                        );

                        const attachedFilesText = hydratedFiles
                            .map(file => `- ${file.title} (URL: ${file.url})\nContent:\n${file.content}`)
                            .join('\n\n');
                        attachedFilesInfo = `ATTENTION: The user has attached the following files. Analyze these files directly and provide a comprehensive answer based on their content. You do NOT need to use the 'reason' tool since all relevant information is already provided in the attached files:\n\n${attachedFilesText}`;
                        shouldUseReason = false;
                    } else {
                        const attachedFilesText = selectedFiles
                            .map(file => `- ${file.title} (URL: ${file.url})`)
                            .join('\n');
                        attachedFilesInfo = `ATTENTION: The user has attached the following files. Use the 'reason' tool to search for relevant information from these and other documents in the knowledge base:\n\n${attachedFilesText}`;
                        shouldUseReason = true;
                    }
                }

                const baseSystemPrompt = `You are an AI assistant that answers questions using SharePoint knowledge bases.

WORKFLOW:
1. For SharePoint data queries, use the 'reason' tool with appropriate direction_guidance to gather information
2. Once you have sufficient data from the reason tool, provide a comprehensive final answer
3. DO NOT call the reason tool repeatedly - one thorough analysis is usually sufficient
4. PLEASE USE THE LEAST TOOL USAGE AS POSSIBLE
5. AIM TO OUTPUT A SUCCINCT ANSWER
6. ALWAYS respond in the SAME LANGUAGE as the user's query

CITATIONS (MANDATORY):
- Include numbered citations [1], [2] in your response text
- End with: <references><reference id="1" source="Title" url="s3://path" /></references>

${attachedFilesInfo}

IMPORTANT INSTRUCTIONS FOR ATTACHED FILES:
${!shouldUseReason ?
                        `The attached files' content is already provided above. DO NOT search for these files again - analyze their content directly.` :
                        `When searching for the attached files mentioned above, ALWAYS call the reason tool with direction_guidance parameter set to: "The user has attached these files: ${selectedFiles?.map(f => f.title).join(', ')}. When using sharepoint_retrieve, use searchMode:'filename' to find these specific files first. Then answer the user's query based on their content."`}

User Query: ${input}

If the query is irrelevant (greetings, weather, etc.), respond: "I'm sorry, I cannot help with that."
If no relevant data is found, respond: "I'm sorry, I couldn't find any relevant data in the knowledge base."`;

                // Get regular tools for main agent
                const regularTools = initializeRegularTools(AgentType.SHAREPOINT_AGENT_V2, {
                    dataStream,
                    messages: messagesWithoutFiles(messages) as any,
                    session
                });
                
                // Define available tools for this agent
                const availableTools = ['reason', ...Object.keys(regularTools)];
                
                // Add tool constraints to system prompt
                const constrainedSystemPrompt = addToolConstraints(baseSystemPrompt, availableTools);

                const mainAgentResult = streamText({
                    model: myProvider.languageModel('bedrock-sonnet-latest'),
                    messages: messagesWithoutFiles(messages) as any,
                    experimental_generateMessageId: generateUUID,
                    temperature: 0.7,
                    stopWhen: stepCountIs(5),
                    experimental_telemetry: { isEnabled: true },

                    tools: {
                        reason: reason({
                            dataStream,
                            messages: messagesWithoutFiles(messages) as any,
                            agentType: AgentType.SHAREPOINT_AGENT_V2,
                            deepSearch,
                            selectedFiles,
                        }),
                        ...regularTools,
                    },

                    system: constrainedSystemPrompt,

                    onFinish: async ({ response, usage }) => {
                        const assistantId = getTrailingMessageId({
                            messages: response.messages.filter(
                                (message) => message.role === 'assistant',
                            ),
                        });

                        if (!assistantId) {
                            console.error('streamSharePointAgent: No assistant message found in main agent stream response!');
                            return;
                        }

                        if (usage) {
                            const modelId = 'eu.anthropic.claude-sonnet-4-20250514-v1:0';
                            const cost = calculateCost(modelId, usage.inputTokens, usage.outputTokens);
                            const costData = {
                                toolName: shouldUseReason ? 'sharepoint_main_agent' : 'sharepoint_direct_files_agent',
                                modelId,
                                inputTokens: usage.inputTokens,
                                outputTokens: usage.outputTokens,
                                cost,
                            };
                            dataStream.write({
                                'type': 'message-annotations',
                                'value': [{ type: 'cost_update', data: costData as any }]
                            });
                        }

                        /* FIXME(@ai-sdk-upgrade-v5): The `appendResponseMessages` option has been removed. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#message-persistence-changes */
                        const [, assistantMessage] = appendResponseMessages({
                            messages: [userMessage],
                            responseMessages: response.messages,
                        });

                        const formattedParts = (assistantMessage.parts ?? []).map(part =>
                            typeof part === 'string' ? { type: 'text', text: part } : part
                        );

                        if (formattedParts.length === 0) {
                            formattedParts.push({ type: 'text', text: 'SharePoint analysis completed.' });
                        }

                        const userMessageAttachments = selectedFiles?.map(file => ({
                            url: file.url,
                            name: file.title,
                            contentType: "application/octet-stream",
                            metadata: {
                                excerpt: file.content,
                                type: 'file_search',
                            }
                        })) || [];

                        if (session.user?.id) {
                            await saveMessages({
                                messages: [
                                    {
                                        id: assistantId,
                                        chatId: id,
                                        role: assistantMessage.role,
                                        createdAt: new Date(),
                                        parts: formattedParts,
                                        attachments: userMessageAttachments,
                                        useCaseId: null,
                                        agentType: selectedChatModel,
                                        modelId: myProvider.languageModel('bedrock-sonnet-latest').modelId,
                                        inputTokens: (usage?.inputTokens ?? 0) + titleInputTokens,
                                        outputTokens: (usage?.outputTokens ?? 0) + titleOutputTokens,
                                        processed: false,
                                    },
                                ],
                            });


                        }
                    },

                    onError: (error) => {
                        console.error('streamSharePointAgent: Error in main agent stream', error);
                        dataStream.write({
                            'type': 'message-annotations',

                            'value': [{
                                type: 'sharepoint_update',
                                data: {
                                    id: generateUUID(),
                                    type: 'error',
                                    status: 'failed',
                                    message: `Overall process failed: ${error instanceof Error ? error.message : String(error)}`,
                                    timestamp: Date.now(),
                                    toolCallId: generateUUID(),
                                    details: { error: error instanceof Error ? error.message : String(error) },
                                },
                            }]
                        });
                    }
                });

                return mainAgentResult.mergeIntoUIMessageStream(dataStream);

            } catch (error) {
                console.error('streamSharePointAgent: Error during stream setup', error);
                dataStream.write({
                    'type': 'message-annotations',

                    'value': [{
                        type: 'sharepoint_update',
                        data: {
                            id: generateUUID(),
                            type: 'error',
                            status: 'failed',
                            message: `Analysis setup failed: ${error instanceof Error ? error.message : String(error)}`,
                            timestamp: Date.now(),
                            toolCallId: generateUUID(),
                            details: { error: error instanceof Error ? error.message : String(error) },
                        },
                    }]
                });
            }
        },
    });
};