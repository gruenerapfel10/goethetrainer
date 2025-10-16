import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getS3FileContent } from '@/lib/utils/s3-content';

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

    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        
        // Special handling for file not found errors
        if (errorMessage.includes('File not found')) {
            return NextResponse.json({ 
                error: 'File not found in storage', 
                details: errorMessage 
            }, { status: 404 });
        }
        
        // Log the error for debugging
        console.error('[raw-content API] Error:', error);
        
        return NextResponse.json({ 
            error: errorMessage,
            code: error.Code || 'UNKNOWN_ERROR'
        }, { status: 500 });
    }
} 