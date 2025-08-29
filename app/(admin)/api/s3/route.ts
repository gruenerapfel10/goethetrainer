import { NextResponse } from 'next/server';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get('prefix') || '';

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3.send(command);
    return NextResponse.json({
      files: response.Contents?.map(file => ({
        Key: file.Key,
        LastModified: file.LastModified,
        Size: file.Size,
      })) || []
    });
  } catch (error) {
    console.error('S3 List Error:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const directory = formData.get('directory') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `${directory}/${Date.now()}-${file.name}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));

    return NextResponse.json({
      url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    });
  } catch (error) {
    console.error('S3 Upload Error:', error);
    return NextResponse.json(
      { error: 'File upload failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json(
      { error: 'Missing file key' },
      { status: 400 }
    );
  }

  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('S3 Delete Error:', error);
    return NextResponse.json(
      { error: 'File deletion failed' },
      { status: 500 }
    );
  }
}
