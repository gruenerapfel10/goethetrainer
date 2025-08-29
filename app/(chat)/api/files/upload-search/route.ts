import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { auth } from '@/app/(auth)/auth';

const ALLOWED_FILE_TYPES = [
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
  // Removed: 'image/jpeg', 'image/png' - AWS Bedrock KB doesn't support image content extraction
];

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    .refine((file) => ALLOWED_FILE_TYPES.includes(file.type), {
      message: 'File type should be one of the allowed types',
    }),
});

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucketName = process.env.FILE_UPLOAD_S3_BUCKET_NAME!;

// Function to safely sanitize filename while preserving readability
function sanitizeFilename(filename: string): string {
  // Normalize Unicode characters to their composed form
  const normalized = filename.normalize('NFC');

  // Replace problematic characters but keep basic special chars
  const sanitized = normalized
    .replace(/[^\w\s\-\.\(\)]/g, '') // Keep word chars, spaces, hyphens, dots, parentheses
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

  return sanitized;
}

// Alternative: More aggressive sanitization (ASCII only)
function sanitizeFilenameASCII(filename: string): string {
  return filename
    .normalize('NFD') // Decompose Unicode
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-zA-Z0-9\-\.\(\)]/g, '_') // Replace non-ASCII with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const originalFilename = (formData.get('file') as File).name;

    const fileExtension = originalFilename.split('.').pop();
    const filenameWithoutExtension = originalFilename.replace(/\.[^/.]+$/, '');

    // Sanitize the filename to handle special characters properly
    const sanitizedFilename = sanitizeFilename(filenameWithoutExtension);

    // Generate unique filename
    const uniqueFilename = `${sanitizedFilename}_${uuidv4()}.${fileExtension}`;

    const fileBuffer = await file.arrayBuffer();

    try {
      // Upload file to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueFilename, // S3 key should be the sanitized filename
        Body: new Uint8Array(fileBuffer),
        ContentType: file.type,
      });

      await s3Client.send(uploadCommand);

      // Generate the public URL with proper encoding
      const region = process.env.AWS_REGION || 'us-east-1';
      const encodedFilename = encodeURIComponent(uniqueFilename);
      const url = `https://${bucketName}.s3.${region}.amazonaws.com/${encodedFilename}`;

      // Return response in the same format as Vercel Blob
      const data = {
        url: url,
        pathname: uniqueFilename,
        contentType: file.type,
        originalName: originalFilename, // Include original name for reference
      };

      return NextResponse.json(data);
    } catch (error) {
      console.error('S3 upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
