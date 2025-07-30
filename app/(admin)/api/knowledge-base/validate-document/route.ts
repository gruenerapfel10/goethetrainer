import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { BedrockAgentRuntimeClient, RetrieveCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from 'node:stream';

const bedrockAgentRuntimeClient = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION || 'eu-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

async function getS3FileContent(s3Url: string): Promise<string> {
    try {
        const urlParts = s3Url.replace('s3://', '').split('/');
        const bucketName = urlParts[0];
        const key = urlParts.slice(1).join('/');

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        const response = await s3Client.send(command);
        const stream = response.Body as Readable;

        return new Promise((resolve, reject) => {
            const chunks: Uint8Array[] = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        });
    } catch (error) {
        console.error(`Error fetching content from S3:`, error);
        return '';
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileName, s3Url, testContent } = await request.json();

        if (!fileName || !s3Url) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const kbId = process.env.SHAREPOINT_KNOWLEDGE_BASE_ID;
        if (!kbId) {
            return NextResponse.json({ error: 'Knowledge base not configured' }, { status: 500 });
        }

        // Test 1: Filename search
        const filenameCommand = new RetrieveCommand({
            knowledgeBaseId: kbId,
            retrievalQuery: { text: `filename: ${fileName} file: ${fileName} document: ${fileName}` },
            retrievalConfiguration: {
                vectorSearchConfiguration: { numberOfResults: 10 },
            },
        });

        const filenameResponse = await bedrockAgentRuntimeClient.send(filenameCommand);
        const filenameMatches = (filenameResponse.retrievalResults || []).filter(
            result => result.location?.s3Location?.uri?.includes(fileName)
        );

        // Test 2: Content search (if test content provided)
        let contentMatches: any[] = [];
        if (testContent) {
            const contentCommand = new RetrieveCommand({
                knowledgeBaseId: kbId,
                retrievalQuery: { text: testContent },
                retrievalConfiguration: {
                    vectorSearchConfiguration: { numberOfResults: 20 },
                },
            });

            const contentResponse = await bedrockAgentRuntimeClient.send(contentCommand);
            contentMatches = (contentResponse.retrievalResults || []).filter(
                result => result.location?.s3Location?.uri === s3Url
            );
        }

        // Test 3: Get actual file content from S3
        const actualContent = await getS3FileContent(s3Url);
        const contentPreview = actualContent.substring(0, 500);

        // Analyze results
        const validation = {
            fileName,
            s3Url,
            tests: {
                filenameSearch: {
                    success: filenameMatches.length > 0,
                    matchCount: filenameMatches.length,
                    topScore: filenameMatches[0]?.score || 0,
                    message: filenameMatches.length > 0 
                        ? `Found ${filenameMatches.length} matches for filename` 
                        : 'No matches found for filename search'
                },
                contentSearch: testContent ? {
                    success: contentMatches.length > 0,
                    matchCount: contentMatches.length,
                    topScore: contentMatches[0]?.score || 0,
                    foundInChunks: contentMatches.map((m: any) => ({
                        score: m.score,
                        excerpt: m.content?.text?.substring(0, 200)
                    })),
                    message: contentMatches.length > 0 
                        ? `Found ${contentMatches.length} chunks containing the test content` 
                        : 'Test content not found in indexed chunks'
                } : null,
                s3Access: {
                    success: actualContent.length > 0,
                    contentLength: actualContent.length,
                    contentPreview,
                    message: actualContent.length > 0 
                        ? 'Successfully retrieved content from S3' 
                        : 'Failed to retrieve content from S3'
                }
            },
            summary: {
                indexingStatus: filenameMatches.length > 0 ? 'INDEXED' : 'NOT_INDEXED',
                contentExtractionStatus: !testContent ? 'NOT_TESTED' : 
                    (contentMatches.length > 0 ? 'EXTRACTED' : 'EXTRACTION_FAILED'),
                recommendations: [] as string[]
            }
        };

        // Generate recommendations
        if (filenameMatches.length === 0) {
            validation.summary.recommendations.push(
                'Document not found by filename. Check if document is still being processed or if indexing failed.'
            );
        }
        
        if (testContent && contentMatches.length === 0 && actualContent.includes(testContent)) {
            validation.summary.recommendations.push(
                'Content exists in S3 but not found in search. Content extraction may have failed during indexing.'
            );
        }

        if (filenameMatches.length > 0 && filenameMatches[0] && filenameMatches[0].score! < 0.5) {
            validation.summary.recommendations.push(
                'Low relevance score for filename match. Consider using filename search mode with lower threshold.'
            );
        }

        return NextResponse.json(validation);

    } catch (error) {
        console.error('Document validation error:', error);
        return NextResponse.json({ 
            error: 'Failed to validate document',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
} 