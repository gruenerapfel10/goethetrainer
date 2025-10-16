import { tool } from 'ai';
import { z } from 'zod';
import { BedrockAgentRuntimeClient, RetrieveCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { filesMetadata } from '@/lib/db/schema';
import { db } from "@/lib/db/client";
import { eq } from 'drizzle-orm';
import type { Session } from 'next-auth';

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

// Cache S3 metadata to avoid repeated HeadObject calls
const s3MetadataCache = new Map<string, { sizeInBytes: number; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

// Helper to normalize strings: remove non-alphanumeric, lowercase
function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper function to calculate relevance score
function calculateRelevanceScore(fileName: string, searchQuery: string): number {
  const lowerFileName = fileName.toLowerCase();
  const lowerQuery = searchQuery.toLowerCase();
  
  // Normalize both for fuzzy matching
  const normalizedFileName = normalizeString(fileName);
  const normalizedQuery = normalizeString(searchQuery);

  // Exact match on normalized strings gets highest score
  if (normalizedFileName === normalizedQuery) return 100;

  // Starts with query on normalized strings gets high score
  if (normalizedFileName.startsWith(normalizedQuery)) return 90;

  // Contains query as normalized substring
  if (normalizedFileName.includes(normalizedQuery)) return 90;

  // Fallback: original lowercase matching
  if (lowerFileName === lowerQuery) return 100;
  if (lowerFileName.startsWith(lowerQuery)) return 90;
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
    // Check cache first
    const cached = s3MetadataCache.get(s3Url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return { sizeInBytes: cached.sizeInBytes };
    }

    try {
        const urlParts = s3Url.replace('s3://', '').split('/');
        const bucketName = urlParts[0];
        const key = urlParts.slice(1).join('/');

        if (!bucketName || !key) {
            return { sizeInBytes: 0 };
        }

        const command = new HeadObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        
        const response = await s3Client.send(command);
        const sizeInBytes = response.ContentLength || 0;
        
        // Cache the result
        s3MetadataCache.set(s3Url, { sizeInBytes, timestamp: Date.now() });
        
        return { sizeInBytes };

    } catch (error) {
        return { sizeInBytes: 0 };
    }
}

async function searchFiles(fileNameQuery: string, searchMode: 'semantic' | 'filename' | 'hybrid' = 'hybrid', deepResearch = false) { 
    try {
        // Fetch only INDEXED files from the KB
        const dbFiles = await db
            .select({
                fileName: filesMetadata.fileName,
                s3Key: filesMetadata.s3Key,
                s3Bucket: filesMetadata.s3Bucket,
                sizeBytes: filesMetadata.sizeBytes,
                ingestionStatus: filesMetadata.ingestionStatus,
            })
            .from(filesMetadata)
            .where(eq(filesMetadata.ingestionStatus, 'INDEXED'))
            .execute();


        const scoredDbResults = dbFiles
            .map(file => ({
                file,
                score: calculateRelevanceScore(file.fileName || file.s3Key, fileNameQuery)
            }))
            .sort((a, b) => b.score - a.score)
            .filter(({ score }) => score >= 65)
            .map(({ file, score }) => ({
                title: file.fileName || file.s3Key.split('/').pop() || 'Unnamed File',
                url: `s3://${file.s3Bucket}/${file.s3Key}`,
                content: `File Status: ${file.ingestionStatus}`,
                score: score / 100,
                sizeInBytes: file.sizeBytes || 0,
                source: 'db'
            }));

        // Get semantic search results if needed
        let semanticResults: any[] = [];
        if (searchMode !== 'filename') {
            let knowledgeBaseIds: string[] = [];
            const kbId = process.env.SHAREPOINT_KNOWLEDGE_BASE_ID;
            if (!kbId) {
                console.error('[searchFiles] SHAREPOINT_KNOWLEDGE_BASE_ID not set');
                throw new Error('SHAREPOINT_KNOWLEDGE_BASE_ID environment variable is not set');
            }
            knowledgeBaseIds = [kbId];

            const allRetrievalResults: any[] = [];
            const numResults = deepResearch ? 50 : 30;

            for (const kbId of knowledgeBaseIds) {
                try {
                    let nextToken: string | undefined;
                    let pageCount = 0;
                    const maxPages = deepResearch ? 10 : 5; // More pages for deep research
                    
                    do {
                        const command = new RetrieveCommand({
                            knowledgeBaseId: kbId,
                            retrievalQuery: { text: fileNameQuery },
                            retrievalConfiguration: {
                                vectorSearchConfiguration: { 
                                    numberOfResults: numResults,
                                    overrideSearchType: "HYBRID"
                                }
                            },
                            ...(nextToken && { nextToken })
                        });

                        const response = await bedrockAgentRuntimeClient.send(command);
                        pageCount++;
                        
                        if (response.retrievalResults) {
                            allRetrievalResults.push(...response.retrievalResults);
                        }
                        
                        nextToken = response.nextToken;
                        
                    } while (nextToken && pageCount < maxPages);
                    
                } catch (error) {
                    console.error('[searchFiles] Error in semantic search:', error);
                }
            }

            // Implement parallel S3 metadata fetching
            const s3Urls = allRetrievalResults
                .map(r => r.location?.s3Location?.uri || r.location?.webLocation?.url || '#')
                .filter(url => url.startsWith('s3://'));
            
            // Fetch all metadata in parallel
            const metadataPromises = s3Urls.map(url => getS3ObjectMetadata(url));
            const metadataResults = await Promise.all(metadataPromises);
            
            // Create a map for quick lookup
            const metadataMap = new Map<string, number>();
            s3Urls.forEach((url, index) => {
                metadataMap.set(url, metadataResults[index].sizeInBytes);
            });
            
            // Process semantic results with cached metadata
            semanticResults = allRetrievalResults
                .map((result) => {
                    const url = result.location?.s3Location?.uri || result.location?.webLocation?.url || '#';
                    const content = result.content?.text || '';
                    const sizeInBytes = url.startsWith('s3://') ? (metadataMap.get(url) || 0) : 0;

                    return {
                        title: url.split('/').pop() || 'Unknown',
                        url: url,
                        content: content,
                        score: parseFloat((result.score || 0).toFixed(2)),
                        sizeInBytes: sizeInBytes,
                        source: 'semantic'
                    };
                })
                .filter(r => r.score >= 0.9);
        }

        const allResults = [...scoredDbResults, ...semanticResults]
            .sort((a, b) => b.score - a.score);

        return allResults;

    } catch (error) {
        console.error('[searchFiles] Fatal error:', {
            error: error instanceof Error ? error.message : String(error),
            query: fileNameQuery,
            searchMode
        });
        throw error;
    }
}

// Define the parameters for the tool
const sharepointRetrieveParameters = z.object({
    query: z.string().describe('A specific filename or search query to find documents. For exact files like "9550-REP-001.pdf", just use the filename.'),
});

interface SharepointRetrieveProps {
    deepResearch?: boolean;
}

// Create the tool factory function using native AI SDK
const createSharepointRetrieveTool = (deepResearch: boolean = false) =>
    tool({
        description: 'EXACT FILENAME SEARCH that works just like the File Search button. Searches for files by exact filename first, then partial matches, then semantic content. Perfect for finding specific files like "9550-REP-001.pdf".',
        inputSchema: sharepointRetrieveParameters,
        
        execute: async ({ query }) => {
            if (!query || query.trim() === '') {
                throw new Error('Missing required parameter: query. You must provide a search query string.');
            }

            const results = await searchFiles(query, 'hybrid', deepResearch);
            
            return {
                documents: results.slice(0, 30),
                summary: `Found ${results.length} documents for query: "${query}"`,
                query
            };
        },
    });

// Export the wrapper function like deep-research does
export const sharepointRetrieve = ({ deepResearch = false }: SharepointRetrieveProps) => {
    return createSharepointRetrieveTool(deepResearch);
};

export type SharePointRetrievalResult = z.infer<typeof sharepointRetrieveParameters>;