import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('S3 preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview URL' },
      { status: 500 }
    );
  }
}
