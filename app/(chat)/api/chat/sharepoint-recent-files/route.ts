import { NextResponse } from 'next/server';
import { filesMetadata } from '@/lib/db/schema';
import { db } from "@/lib/db/client";
import { desc, eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { page = 1, limit = 50 } = await req.json();
    const offset = (page - 1) * limit;

    // Get recent files from database, prioritize INDEXED files
    const files = await db
      .select({
        fileName: filesMetadata.fileName,
        s3Key: filesMetadata.s3Key,
        s3Bucket: filesMetadata.s3Bucket,
        sizeBytes: filesMetadata.sizeBytes,
        ingestionStatus: filesMetadata.ingestionStatus,
        createdAt: filesMetadata.createdAt,
        updatedAt: filesMetadata.updatedAt,
      })
      .from(filesMetadata)
      .where(eq(filesMetadata.ingestionStatus, 'INDEXED')) // Only show indexed files
      .orderBy(desc(filesMetadata.updatedAt)) // Order by most recently updated
      .limit(Math.min(limit, 50) + 1) // Get one extra to check if there are more
      .offset(offset)
      .execute();

    // Check if there are more files
    const hasMore = files.length > Math.min(limit, 50);
    const filesToReturn = hasMore ? files.slice(0, Math.min(limit, 50)) : files;

    const formattedFiles = filesToReturn.map(file => ({
      title: file.fileName || file.s3Key.split('/').pop() || 'Unnamed File',
      url: `s3://${file.s3Bucket}/${file.s3Key}`,
      content: `File Status: ${file.ingestionStatus}`,
      status: file.ingestionStatus,
      size: file.sizeBytes,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    }));

    return NextResponse.json({ 
      files: formattedFiles,
      hasMore,
      page,
      totalShown: filesToReturn.length,
      isRecent: true
    });

  } catch (error) {
    console.error('List recent files error:', error);
    return NextResponse.json({ error: 'Failed to list recent files' }, { status: 500 });
  }
}