import { type NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { auth } from '@/app/(auth)/auth';
import type { Readable } from 'node:stream';
import pdf2md from '@opendocsg/pdf2md';

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

function isPDF(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.pdf');
}

async function getS3FileContent(s3Url: string): Promise<{ content: string; isPdf: boolean }> {
    try {
        const urlParts = s3Url.replace('s3://', '').split('/');
        const bucketName = urlParts[0];
        const key = urlParts.slice(1).join('/');
        const fileName = key.split('/').pop() || '';

        if (!bucketName || !key) {
            throw new Error(`Invalid S3 URL format: ${s3Url}`);
        }

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        const response = await s3Client.send(command);
        
        if (!response.Body) {
            throw new Error('No content received from S3');
        }

        // Convert the readable stream to buffer
        const stream = response.Body as Readable;
        const chunks: Buffer[] = [];
        
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        
        const buffer = Buffer.concat(chunks);

        // If it's a PDF, convert to markdown
        if (isPDF(fileName)) {
            try {
                console.log('Converting PDF to markdown...');
                const markdown = await pdf2md(buffer);
                return { content: markdown, isPdf: true };
            } catch (error) {
                console.error('Error converting PDF to markdown:', error);
                throw new Error('Failed to convert PDF to markdown');
            }
        }

        // For non-PDF files, return as UTF-8 string
        return { content: buffer.toString('utf-8'), isPdf: false };

    } catch (error) {
        console.error(`Error fetching content from S3 for ${s3Url}:`, error);
        throw error;
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const { s3Url } = await req.json();

        if (!s3Url) {
            return NextResponse.json({ error: 'S3 URL is required' }, { status: 400 });
        }

        if (!s3Url.startsWith('s3://')) {
            return NextResponse.json({ error: 'Invalid S3 URL format' }, { status: 400 });
        }

        const { content, isPdf } = await getS3FileContent(s3Url);
        return NextResponse.json({ content, isPdf });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
} 