import { type NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json(
      { error: 'Missing logo key' },
      { status: 400 }
    );
  }

  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.LOGO_S3_BUCKET_NAME!,
      Key: decodeURIComponent(key),
    }));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logo Delete Error:', error);
    return NextResponse.json(
      { error: 'Logo deletion failed', details: error.message },
      { status: 500 }
    );
  }
}