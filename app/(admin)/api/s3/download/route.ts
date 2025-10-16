import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const s3Url = searchParams.get('url');

    if (!s3Url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const urlParts = s3Url.replace('s3://', '').split('/');
    const bucketName = urlParts[0];
    const key = urlParts.slice(1).join('/');

    if (!bucketName || !key) {
      return NextResponse.json({ error: 'Invalid S3 URL' }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: 'Empty response from S3' }, { status: 500 });
    }

    const stream = response.Body as ReadableStream;
    const fileName = key.split('/').pop() || 'download';

    return new NextResponse(stream, {
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': response.ContentLength?.toString() || '0',
      },
    });
  } catch (error) {
    console.error('S3 download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
