import { type NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { auth } from '@/app/(auth)/auth';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function parseS3Url(s3Url: string): { bucketName: string; key: string } | null {
  try {
    // Handle both s3:// and https:// formats
    if (s3Url.startsWith('s3://')) {
      const urlParts = s3Url.replace('s3://', '').split('/');
      const bucketName = urlParts[0];
      const key = urlParts.slice(1).join('/');
      return { bucketName, key };
    } else if (s3Url.startsWith('https://')) {
      const url = new URL(s3Url);

      // Handle format: https://bucket-name.s3.region.amazonaws.com/key
      if (
        url.hostname.includes('.s3.') &&
        url.hostname.includes('.amazonaws.com')
      ) {
        const bucketName = url.hostname.split('.s3.')[0];
        // Decode the key to handle URL-encoded characters
        const key = decodeURIComponent(url.pathname.substring(1)); // Remove leading slash and decode
        return { bucketName, key };
      }

      // Handle format: https://s3.region.amazonaws.com/bucket-name/key
      if (
        url.hostname.startsWith('s3.') &&
        url.hostname.includes('.amazonaws.com')
      ) {
        const pathParts = url.pathname.substring(1).split('/');
        const bucketName = pathParts[0];
        // Decode the key to handle URL-encoded characters
        const key = decodeURIComponent(pathParts.slice(1).join('/'));
        return { bucketName, key };
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing S3 URL:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    console.log('[presigned-URL API] Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      userEmail: session?.user?.email
    });
    
    if (!session || !session.user || !session.user.id) {
      console.log('[presigned-URL API] Authentication failed - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { s3Url } = await req.json();

    if (!s3Url) {
      return NextResponse.json(
        { error: 'Invalid S3 URL provided.' },
        { status: 400 },
      );
    }

    // Parse bucket name and key from s3Url
    const parsed = parseS3Url(s3Url);

    if (!parsed) {
      return NextResponse.json(
        {
          error:
            'Could not parse bucket or key from S3 URL. Supported formats: s3://bucket/key or https://bucket.s3.region.amazonaws.com/key',
        },
        { status: 400 },
      );
    }

    const { bucketName, key } = parsed;

    if (!bucketName || !key) {
      return NextResponse.json(
        { error: 'Could not parse bucket or key from S3 URL.' },
        { status: 400 },
      );
    }

    // First check if the object exists using HeadObject
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      
      // This will throw if the object doesn't exist
      await s3Client.send(headCommand);
    } catch (headError: any) {
      // If the file doesn't exist, return 404
      if (headError.name === 'NotFound' || headError.$metadata?.httpStatusCode === 404) {
        console.log(`[presigned-URL API] File not found: ${s3Url}`);
        return NextResponse.json(
          { 
            error: 'File not found',
            details: `The file at ${key} does not exist in bucket ${bucketName}`
          },
          { status: 404 }
        );
      }
      // For other errors, re-throw
      throw headError;
    }

    // If file exists, generate presigned URL
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    }); // URL valid for 1 hour

    return NextResponse.json({
      presignedUrl,
      originalUrl: s3Url,
      bucketName,
      key,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate presigned URL.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
