import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    // List all files in the logos folder from Vercel Blob
    const { blobs } = await list({
      prefix: 'logos/',
    });

    // Transform blob list to match expected format
    const files = blobs.map(blob => ({
      Key: blob.pathname,
      Url: blob.url,
      LastModified: blob.uploadedAt,
      Size: blob.size,
    }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Logo List Error:', error);
    // Return empty list instead of error to prevent app crashes
    return NextResponse.json({ files: [] });
  }
}