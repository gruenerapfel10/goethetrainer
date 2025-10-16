import { type NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { filesMetadata } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import {db} from "@/lib/db/client";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function getS3InfoByFilename(filename: string): Promise<{ bucket: string; key: string } | null> {
  try {
    // Get the most recent file with this name
    const file = await db
    .select({
      s3Bucket: filesMetadata.s3Bucket,
      s3Key: filesMetadata.s3Key,
    })
    .from(filesMetadata)
    .where(eq(filesMetadata.fileName, filename))
    .orderBy(desc(filesMetadata.updatedAt))
    .limit(1);

    if (file.length === 0) {
      return null;
    }

    return {
      bucket: file[0].s3Bucket,
      key: file[0].s3Key,
    };
  } catch (error) {
    console.error('Database lookup error:', error);
    return null;
  }
}

// Helper function to parse S3 URI
function parseS3Uri(s3Uri: string): { bucket: string; key: string } | null {
  try {
    if (!s3Uri.startsWith('s3://')) {
      return null;
    }

    const withoutProtocol = s3Uri.replace('s3://', '');
    const parts = withoutProtocol.split('/');

    if (parts.length < 2) {
      return null;
    }

    const bucket = parts[0];
    const key = parts.slice(1).join('/');

    return { bucket, key };
  } catch (error) {
    console.error('Error parsing S3 URI:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    const filename = searchParams.get('filename');
    const s3Uri = searchParams.get('s3Uri'); // New parameter for full S3 URIs

    let bucket: string;
    let key: string;

    if (s3Uri) {
      // Handle full S3 URI: s3://bucket/key/path
      const parsed = parseS3Uri(s3Uri);
      if (!parsed) {
        return NextResponse.json(
          { error: `Invalid S3 URI format: ${s3Uri}` },
          { status: 400 }
        );
      }
      bucket = parsed.bucket;
      key = parsed.key;
    } else if (path) {
      // Handle direct S3 path format: bucket/key
      const parts = path.split('/');
      if (parts.length < 2) {
        return NextResponse.json(
          { error: `Invalid path format: ${path}. Expected format: bucket/key` },
          { status: 400 }
        );
      }
      bucket = parts[0];
      key = parts.slice(1).join('/');
    } else if (filename) {
      // Look up the S3 location by filename in database
      const s3Info = await getS3InfoByFilename(filename);

      if (!s3Info) {
        return NextResponse.json(
          { error: `File '${filename}' not found in database` },
          { status: 404 }
        );
      }
      bucket = s3Info.bucket;
      key = s3Info.key;
    } else {
      return NextResponse.json(
        { error: 'Missing required parameter. Provide either: s3Uri, path (bucket/key), or filename' },
        { status: 400 }
      );
    }

    // Validate that we have both bucket and key
    if (!bucket || !key) {
      return NextResponse.json(
        { error: 'Invalid S3 location: missing bucket or key' },
        { status: 400 }
      );
    }


    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}