import { type NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

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
        const key = url.pathname.substring(1); // Remove leading slash
        return { bucketName, key };
      }

      // Handle format: https://s3.region.amazonaws.com/bucket-name/key
      if (
        url.hostname.startsWith('s3.') &&
        url.hostname.includes('.amazonaws.com')
      ) {
        const pathParts = url.pathname.substring(1).split('/');
        const bucketName = pathParts[0];
        const key = pathParts.slice(1).join('/');
        return { bucketName, key };
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing S3 URL:', error);
    return null;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { s3Url } = await req.json();

    if (!s3Url) {
      return NextResponse.json(
        { error: 'S3 URL is required.' },
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

    // Delete the object from S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(deleteCommand);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      deletedUrl: s3Url,
      bucketName,
      key,
    });
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete file from S3.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
