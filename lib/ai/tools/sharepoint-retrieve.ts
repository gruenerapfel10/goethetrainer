import { tool } from 'ai';
import { z } from 'zod';
import { BedrockAgentRuntimeClient, RetrieveCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { type StandardizedToolResult, TimelineItemUtils } from './types';
import { filesMetadata } from '@/lib/db/schema';
import { db } from "@/lib/db/client";
import { ilike, or } from 'drizzle-orm';

// Initialize AWS SDK clients
const bedrockAgentRuntimeClient = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION || 'eu-central-1',
});

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// Helper function to calculate relevance score (same as file-search.tsx)
function calculateRelevanceScore(fileName: string, searchQuery: string): number {
  const lowerFileName = fileName.toLowerCase();
  const lowerQuery = searchQuery.toLowerCase();

  // Exact match gets highest score
  if (lowerFileName === lowerQuery) return 100;

  // Starts with query gets high score
  if (lowerFileName.startsWith(lowerQuery)) return 90;

  // Contains query as a whole word gets medium score
  if (lowerFileName.includes(lowerQuery)) return 80;

  // Contains parts of query gets lower score
  const queryParts = lowerQuery.split(/[\s_-]/);
  let partialMatchScore = 0;
  queryParts.forEach(part => {
    if (lowerFileName.includes(part)) {
      partialMatchScore += 10;
    }
  });

  // Alphanumeric similarity (for numbers)
  const fileNumbers = lowerFileName.match(/\d+/g);
  const queryNumbers = lowerQuery.match(/\d+/g);
  if (fileNumbers && queryNumbers) {
    fileNumbers.forEach(fileNum => {
      queryNumbers.forEach(queryNum => {
        if (fileNum.includes(queryNum) || queryNum.includes(fileNum)) {
          partialMatchScore += 15;
        }
      });
    });
  }

  return partialMatchScore;
}

async function getS3ObjectMetadata(s3Url: string): Promise<{ sizeInBytes: number }> {
    try {
        const urlParts = s3Url.replace('s3://', '').split('/');
        const bucketName = urlParts[0];
        const key = urlParts.slice(1).join('/');

        if (!bucketName || !key) {
            console.warn(`Invalid S3 URL format for metadata retrieval: ${s3Url}`);
            return { sizeInBytes: 0 };
        }

        const command = new HeadObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        
        const response = await s3Client.send(command);
        return { sizeInBytes: response.ContentLength || 0 };

    } catch (error) {
        console.error(`Error fetching metadata from S3 for ${s3Url}:`, error);
        return { sizeInBytes: 0 };
    }
}

async function searchFiles(fileNameQuery: string, searchMode: 'semantic' | 'filename' | 'hybrid' = 'hybrid', deepResearch = false) {
    try {
        // First, get exact and alphanumeric matches from the database
        const dbFiles = await db
            .select({
                fileName: filesMetadata.fileName,
                s3Key: filesMetadata.s3Key,
                s3Bucket: filesMetadata.s3Bucket,
                sizeBytes: filesMetadata.sizeBytes,
                ingestionStatus: filesMetadata.ingestionStatus,
            })
            .from(filesMetadata)
            .where(
                or(
                    ilike(filesMetadata.fileName, `%${fileNameQuery}%`),
                    ilike(filesMetadata.s3Key, `%${fileNameQuery}%`)
                )
            )
            .execute();

        // Score and sort database results
        const scoredDbResults = dbFiles
            .map(file => ({
                file,
                score: calculateRelevanceScore(file.fileName || file.s3Key, fileNameQuery)
            }))
            .sort((a, b) => b.score - a.score)
            .filter(({ score }) => score > 0)
            .map(({ file }) => ({
                title: file.fileName || file.s3Key.split('/').pop() || 'Unnamed File',
                url: `s3://${file.s3Bucket}/${file.s3Key}`,
                content: `File Status: ${file.ingestionStatus}`,
                score: 1.0, // Max score for exact matches
                sizeInBytes: file.sizeBytes || 0,
                source: 'db'
            }));

        // Get semantic search results if needed
        let semanticResults: any[] = [];
        if (searchMode !== 'filename') {
            let knowledgeBaseIds: string[] = [];
            const kbId = process.env.SHAREPOINT_KNOWLEDGE_BASE_ID;
            if (!kbId) {
                throw new Error('SHAREPOINT_KNOWLEDGE_BASE_ID environment variable is not set');
            }
            knowledgeBaseIds = [kbId];

            // Search across knowledge bases
            const allRetrievalResults: any[] = [];
            const numResults = deepResearch ? 50 : 25;

            for (const kbId of knowledgeBaseIds) {
                try {
                    const command = new RetrieveCommand({
                        knowledgeBaseId: kbId,
                        retrievalQuery: { text: fileNameQuery },
                        retrievalConfiguration: {
                            vectorSearchConfiguration: { 
                                numberOfResults: numResults
                            }
                        }
                    });

                    const response = await bedrockAgentRuntimeClient.send(command);
                    if (response.retrievalResults) {
                        allRetrievalResults.push(...response.retrievalResults);
                    }
                } catch (error) {
                    console.error(`Error searching KB ${kbId}:`, error);
                }
            }

            // Process semantic results
            const semanticResultsPromises = allRetrievalResults.map(async (result) => {
                const url = result.location?.s3Location?.uri || result.location?.webLocation?.url || '#';
                const content = result.content?.text || '';
                let sizeInBytes = 0;

                if (url.startsWith('s3://')) {
                    const metadata = await getS3ObjectMetadata(url);
                    sizeInBytes = metadata.sizeInBytes;
                }

                return {
                    title: url.split('/').pop() || 'Unknown',
                    url: url,
                    content: content,
                    score: result.score || 0,
                    sizeInBytes: sizeInBytes,
                    source: 'semantic'
                };
            });

            semanticResults = await Promise.all(semanticResultsPromises);
        }

        // Combine and deduplicate results
        const allResults = [...scoredDbResults, ...semanticResults];
        const uniqueResults = Array.from(
            new Map(allResults.map(item => [item.url, item])).values()
        );

        // Sort results: exact matches first, then semantic
        const exactMatches = uniqueResults.filter(r => r.source === 'db');
        const semanticMatches = uniqueResults.filter(r => r.source === 'semantic')
            .sort((a, b) => b.score - a.score);

        // Return combined results with limits
        const finalResults = [
            ...exactMatches.slice(0, 5), // Top 5 exact matches
            ...semanticMatches.slice(0, deepResearch ? 50 : 25) // Remaining semantic matches
        ];

        console.log(`[SharePoint Retrieve] Query: "${fileNameQuery}"`);
        console.log(`[SharePoint Retrieve] Exact matches: ${exactMatches.length}`);
        console.log(`[SharePoint Retrieve] Semantic matches: ${semanticMatches.length}`);

        return finalResults;

    } catch (error) {
        console.error("Error searching files:", error);
        throw error;
    }
}

// Define the parameters for the tool
const sharepointRetrieveParameters = z.object({
    query: z.string().describe('A specific filename or search query to find documents. For exact files like "9550-REP-001.pdf", just use the filename.'),
    topK: z.number().optional().describe('The maximum number of top results to return. Defaults to 10.'),
    searchMode: z.enum(['semantic', 'filename', 'hybrid']).optional().describe('Search mode: "filename" for exact filename search, "semantic" for content-based search, "hybrid" for both. Defaults to "hybrid".'),
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
        data: results,
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
            'EXACT FILENAME SEARCH that works just like the File Search button. Searches for files by exact filename first, then partial matches, then semantic content. Perfect for finding specific files like "9550-REP-001.pdf".',
        parameters: sharepointRetrieveParameters,
        execute: async ({ query, topK = 10, searchMode = 'hybrid' }: z.infer<typeof sharepointRetrieveParameters>): Promise<StandardizedToolResult> => {
            try {
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

                const results = await searchFiles(query, searchMode, deepResearch);

                if (results.length === 0) {
                    return {
                        data: [],
                        timelineItems: [],
                        summary: {
                            message: `No documents found for query "${query}" using ${searchMode} search`,
                            itemCount: 0,
                            successCount: 0,
                            errorCount: 0,
                        },
                        metadata: { toolName: 'sharepoint_retrieve', resultType: 'document' }
                    };
                }

                const finalResults = results.slice(0, topK);
                return createTimelineItemsFromResults(finalResults);

            } catch (error) {
                console.error("Error during SharePoint retrieval:", error);
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
