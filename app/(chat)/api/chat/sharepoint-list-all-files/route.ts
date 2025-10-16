import { NextResponse } from 'next/server';
import { filesMetadata } from '@/lib/db/schema';
import { db } from "@/lib/db/client";
import { desc } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { page = 1, limit = 20 } = await req.json();

    const offset = (page - 1) * limit;

    // Get paginated files from database
    const files = await db
      .select({
        fileName: filesMetadata.fileName,
        s3Key: filesMetadata.s3Key,
        s3Bucket: filesMetadata.s3Bucket,
        sizeBytes: filesMetadata.sizeBytes,
        ingestionStatus: filesMetadata.ingestionStatus,
        createdAt: filesMetadata.createdAt,
      })
      .from(filesMetadata)
      .orderBy(desc(filesMetadata.createdAt)) // Order by most recent first
      .limit(limit + 1) // Get one extra to check if there are more
      .offset(offset)
      .execute();

    // Check if there are more files
    const hasMore = files.length > limit;
    const filesToReturn = hasMore ? files.slice(0, limit) : files;

    const formattedFiles = filesToReturn.map(file => ({
      title: file.fileName || file.s3Key.split('/').pop() || 'Unnamed File',
      url: `s3://${file.s3Bucket}/${file.s3Key}`,
      content: `File Status: ${file.ingestionStatus}`,
      status: file.ingestionStatus,
      size: file.sizeBytes,
      createdAt: file.createdAt
    }));

    return NextResponse.json({ 
      files: formattedFiles,
      hasMore,
      page,
      totalShown: filesToReturn.length
    });

  } catch (error) {
    console.error('List all files error:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}