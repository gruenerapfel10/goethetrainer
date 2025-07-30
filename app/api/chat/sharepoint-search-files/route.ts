import { NextRequest, NextResponse } from 'next/server';
import { BedrockAgentRuntimeClient, RetrieveCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { auth } from '@/app/(auth)/auth';
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';

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
        return { sizeInBytes: 0 }; // Return 0 on error
    }
}

async function searchFiles(fileNameQuery: string) {
    try {
        const kbId = process.env.SHAREPOINT_KNOWLEDGE_BASE_ID;

        if (!kbId) {
            throw new Error('SHAREPOINT_KNOWLEDGE_BASE_ID environment variable is not set');
        }

        // We use the retrieve command to perform a semantic search that might match file names.
        // A higher number of results increases the chance of finding filename matches.
        const command = new RetrieveCommand({
            knowledgeBaseId: kbId,
            retrievalQuery: { text: fileNameQuery },
            retrievalConfiguration: {
                vectorSearchConfiguration: { numberOfResults: 20 },
            },
        });

        const response = await bedrockAgentRuntimeClient.send(command);

        const allResultsPromises = (response.retrievalResults || []).map(async (result) => {
            console.log("result", result);
            const url = result.location?.webLocation?.url || result.location?.s3Location?.uri || '#';
            const content = result.content?.text || ''; // This is the excerpt
            let sizeInBytes = 0;

            // If it's an S3 URL, fetch metadata for file size
            if (url.startsWith('s3://')) {
                const metadata = await getS3ObjectMetadata(url);
                sizeInBytes = metadata.sizeInBytes;
            }

            return {
                title: result.location?.s3Location?.uri?.split('/').pop() || result.location?.webLocation?.url?.split('/').pop() || 'Unknown',
                url: url,
                content: content, // The excerpt for preview
                sizeInBytes: sizeInBytes,
            };
        });

        const allResults = await Promise.all(allResultsPromises);

        // Deduplicate results based on URL to avoid showing the same file multiple times from different chunks.
        const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

        return uniqueResults.slice(0, 10); // Return top 10 matches

    } catch (error) {
        console.error("Error searching files:", error);
        throw error;
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
        }

        const files = await searchFiles(query);
        return NextResponse.json({ files });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}