import { tool } from 'ai';
import { z } from 'zod';
import { BedrockAgentRuntimeClient, RetrieveCommand, RetrieveCommandInput } from "@aws-sdk/client-bedrock-agent-runtime";
import { calculateCost } from '@/lib/costs';
import { StandardizedToolResult, TimelineItemUtils } from './types';

// Initialize AWS SDK client, ensuring it uses credentials from your environment
const bedrockAgentRuntimeClient = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION || 'eu-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});

// Define the parameters for the ultimate tool
const sharepointRetrieveParameters = z.object({
    query: z.string().describe('A specific, targeted user query to search for relevant documents.'),
    topK: z.number().optional().describe('The maximum number of top results to return if they meet the quality threshold. Defaults to 5.'),
    metadataFilter: z.any().optional().describe('The metadata filter to apply to the retrieval.'),
    minimumScore: z.number().optional().describe('The minimum relevance score (0.0 to 1.0) required for a document to be included. Defaults to 0.5.'),
});

interface SharepointRetrieveProps {
    deepResearch?: boolean;
}

// Helper function to create timeline items from retrieval results
const createTimelineItemsFromResults = (results: any[]): StandardizedToolResult => {
    const timelineItems = results.map(result => 
        TimelineItemUtils.createDocumentItem({
            title: result.title,
            content: result.content,
            url: result.url,
            score: result.score
        })
    );

    return {
        data: results, // Keep original data for backward compatibility
        timelineItems,
        summary: {
            message: `Retrieved ${results.length} relevant documents`,
            itemCount: results.length,
            successCount: results.length,
            errorCount: 0,
        },
        metadata: {
            toolName: 'sharepoint_retrieve',
            resultType: 'document',
        }
    };
};

export const sharepointRetrieve = ({ deepResearch }: SharepointRetrieveProps) =>
    tool({
        description:
            'Performs an intelligent, two-stage retrieval from SharePoint using the state-of-the-art Cohere Rerank v3.5 model. It retrieves candidates, then scores and aggressively filters them, returning ONLY the most relevant documents that meet a minimum confidence score.',
        parameters: sharepointRetrieveParameters,
        execute: async ({ query, topK, metadataFilter, minimumScore }: z.infer<typeof sharepointRetrieveParameters>): Promise<StandardizedToolResult> => {
            try {
                // Validate required parameters first
                if (!query || query.trim() === '') {
                    return {
                        data: [],
                        timelineItems: [],
                        summary: {
                            message: 'Missing required parameter: query',
                            itemCount: 0,
                            successCount: 0,
                            errorCount: 1,
                        },
                        metadata: { 
                            toolName: 'sharepoint_retrieve', 
                            resultType: 'document' 
                        },
                        error: 'Missing required parameter: query. You must provide a search query string.'
                    };
                }

                const kbId = process.env.SHAREPOINT_KNOWLEDGE_BASE_ID;
                if (!kbId) {
                    console.error("CRITICAL: SHAREPOINT_KNOWLEDGE_BASE_ID environment variable is not set.");
                    return { 
                        data: [],
                        timelineItems: [],
                        summary: {
                            message: 'SHAREPOINT_KNOWLEDGE_BASE_ID not set',
                            itemCount: 0,
                            successCount: 0,
                            errorCount: 1,
                        },
                        metadata: { toolName: 'sharepoint_retrieve', resultType: 'document' },
                        error: 'SHAREPOINT_KNOWLEDGE_BASE_ID not set'
                    };
                }

                const initialNumberOfResults = deepResearch ? 100 : 50;
                const finalNumberOfResults = topK ?? (deepResearch ? 10 : 5);
                const relevanceThreshold = minimumScore ?? 0.5;

                const retrievalConfiguration: RetrieveCommandInput['retrievalConfiguration'] = {
                    vectorSearchConfiguration: {
                        numberOfResults: initialNumberOfResults,
                        filter: metadataFilter,
                        rerankingConfiguration: {
                            type: "BEDROCK_RERANKING_MODEL",
                            bedrockRerankingConfiguration: {
                                modelConfiguration: {
                                    modelArn: `arn:aws:bedrock:${process.env.AWS_REGION || 'eu-central-1'}::foundation-model/cohere.rerank-v3-5:0`
                                },
                                numberOfRerankedResults: finalNumberOfResults,
                            },
                        },
                    },
                };

                const command = new RetrieveCommand({
                    knowledgeBaseId: kbId,
                    retrievalQuery: { text: query },
                    retrievalConfiguration,
                });

                const response = await bedrockAgentRuntimeClient.send(command);
                
                // Note: Cost tracking for reranking is handled by AWS Bedrock directly
                // We don't need to estimate tokens or calculate costs here
                
                // Intelligent filtering based on the Cohere Rerank v3.5 score
                const highQualityResults = (response.retrievalResults || []).filter(
                    result => (result.score ?? 0) >= relevanceThreshold
                );

                if (highQualityResults.length === 0) {
                    return {
                        data: [],
                        timelineItems: [],
                        summary: {
                            message: `No documents found for query "${query}" with relevance score above ${relevanceThreshold}`,
                            itemCount: 0,
                            successCount: 0,
                            errorCount: 0,
                        },
                        metadata: { toolName: 'sharepoint_retrieve', resultType: 'document' }
                    };
                }

                const finalResults = highQualityResults.map(result => ({
                    title: result.location?.s3Location?.uri || result.location?.webLocation?.url || 'Unknown Document',
                    url: result.location?.webLocation?.url || result.location?.s3Location?.uri || '#',
                    score: result.score || 0,
                    content: result.content?.text || ''
                }));

                return createTimelineItemsFromResults(finalResults);

            } catch (error) {
                if (error instanceof Error && error.name === 'AccessDeniedException') {
                    console.error("<<<<<<<<<< CRITICAL PERMISSION ERROR >>>>>>>>>>");
                    console.error("RERANKING IS FAILING. The Knowledge Base service role is missing `bedrock:Rerank` permissions. Your results are unfiltered junk.");
                    console.error("Fix this by adding the required IAM policy to the service role in AWS. The policy now also needs to allow invoking the Cohere model.", error);
                    return { 
                        data: [],
                        timelineItems: [],
                        summary: {
                            message: "Reranking failed due to AWS IAM permissions",
                            itemCount: 0,
                            successCount: 0,
                            errorCount: 1,
                        },
                        metadata: { toolName: 'sharepoint_retrieve', resultType: 'document' },
                        error: "Reranking failed due to AWS IAM permissions. Check server logs for details."
                    };
                } else {
                    console.error("Error during SharePoint retrieval:", error);
                }
                return {
                    data: [],
                    timelineItems: [],
                    summary: {
                        message: error instanceof Error ? error.message : String(error),
                        itemCount: 0,
                        successCount: 0,
                        errorCount: 1,
                    },
                    metadata: { toolName: 'sharepoint_retrieve', resultType: 'document' },
                    error: error instanceof Error ? error.message : String(error)
                };
            }
        },
    });

export type SharePointRetrievalResult = z.infer<typeof sharepointRetrieveParameters>;
