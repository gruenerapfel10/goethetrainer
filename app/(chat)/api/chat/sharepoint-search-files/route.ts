import { NextResponse } from 'next/server';
import { filesMetadata } from '@/lib/db/schema';
import { db } from "@/lib/db/client";
import { ilike, or, } from 'drizzle-orm';

// Helper function to calculate relevance score
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

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || query.length < 2) {
      return NextResponse.json({ files: [] });
    }

    // Get files from database that might match
    const files = await db
      .select({
        fileName: filesMetadata.fileName,
        s3Key: filesMetadata.s3Key,
        s3Bucket: filesMetadata.s3Bucket, // Add bucket name to selection
        sizeBytes: filesMetadata.sizeBytes,
        ingestionStatus: filesMetadata.ingestionStatus,
      })
      .from(filesMetadata)
      .where(
        or(
          ilike(filesMetadata.fileName, `%${query}%`),
          ilike(filesMetadata.s3Key, `%${query}%`)
        )
      )
      .execute();

    // Calculate relevance scores and sort results
    const scoredFiles = files
      .map(file => ({
        file,
        score: calculateRelevanceScore(file.fileName || file.s3Key, query)
      }))
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .filter(({ score }) => score > 0) // Only include results with positive scores
      .map(({ file }) => ({
        title: file.fileName || file.s3Key.split('/').pop() || 'Unnamed File',
        url: `s3://${file.s3Bucket}/${file.s3Key}`, // Include bucket name in URL
        content: `File Status: ${file.ingestionStatus}`, // Use ingestion status as content preview
        status: file.ingestionStatus,
        size: file.sizeBytes
      }));

    return NextResponse.json({ files: scoredFiles.slice(0, 10) }); // Limit to top 10 results

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to search files' }, { status: 500 });
  }
}