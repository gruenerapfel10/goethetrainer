import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.LOGO_S3_BUCKET_NAME!,
      Prefix: '',
    });

    const listResponse = await s3.send(listCommand);

    const files =
      listResponse.Contents?.map((file) => {
        if (!file.Key) return null;

        // Construct direct S3 URL since bucket has public read policy
        const url = `https://${process.env.LOGO_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`;

        return {
          Key: file.Key,
          LastModified: file.LastModified,
          Size: file.Size,
          Url: url,
        };
      }).filter(Boolean) || [];

    return NextResponse.json({
      files: files,
    });
  } catch (error) {
    console.error('Logo List Error:', error);
    return NextResponse.json(
      { error: 'Failed to list logos' },
      { status: 500 },
    );
  }
}
