import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { auth } from '@/app/(auth)/auth';

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/html',
  'text/csv',
  'text/xml',
  'application/json',
  'application/xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
];

// Helper to check file extension when MIME type is not reliable
function isAllowedFileExtension(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  const allowedExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', // images
    'pdf', 'doc', 'docx', 'xls', 'xlsx', // documents
    'csv', 'txt', 'md', 'markdown', 'json', // text files
    'xml', 'html', 'htm', 'yml', 'yaml', 'log' // other text
  ];
  return ext ? allowedExtensions.includes(ext) : false;
}

// Get proper MIME type based on file extension
function getMimeType(filename: string, originalMimeType: string): string {
  // If browser provided a valid MIME type, use it
  if (originalMimeType && originalMimeType !== 'application/octet-stream') {
    return originalMimeType;
  }
  
  // Otherwise, determine from extension
  const ext = filename.toLowerCase().split('.').pop();
  const mimeMap: { [key: string]: string } = {
    'json': 'application/json',
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'csv': 'text/csv',
    'txt': 'text/plain',
    'xml': 'application/xml',
    'html': 'text/html',
    'htm': 'text/html',
    'yml': 'text/yaml',
    'yaml': 'text/yaml',
    'log': 'text/plain',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };
  
  return mimeMap[ext || ''] || originalMimeType || 'application/octet-stream';
}

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    }),
    // Validation for file type moved to after we have the filename
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

    const originalFilename = (formData.get('file') as File).name;

    // Validate file size first
    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Validate file type - check both MIME type and extension
    const isAllowedMimeType = ALLOWED_FILE_TYPES.includes(file.type);
    const isAllowedExtension = isAllowedFileExtension(originalFilename);
    
    if (!isAllowedMimeType && !isAllowedExtension) {
      return NextResponse.json({ 
        error: 'File type not supported. Please upload images, PDFs, documents (Word/Excel), or text files (JSON, Markdown, CSV).' 
      }, { status: 400 });
    }

    const fileExtension = originalFilename.split('.').pop();
    const filenameWithoutExtension = originalFilename.replace(/\.[^/.]+$/, '');

    // Sanitize the filename to handle special characters properly
    const sanitizedFilename = sanitizeFilename(filenameWithoutExtension);

    // Generate unique filename
    const uniqueFilename = `${sanitizedFilename}_${uuidv4()}.${fileExtension}`;

    const fileBuffer = await file.arrayBuffer();
    
    // Determine the correct MIME type
    const contentType = getMimeType(originalFilename, file.type);

    try {
      // Upload file to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueFilename, // S3 key should be the sanitized filename
        Body: new Uint8Array(fileBuffer),
        ContentType: contentType,
      });

      await s3Client.send(uploadCommand);

      // Generate the public URL with proper encoding
      const region = process.env.AWS_REGION || 'us-east-1';
      const encodedFilename = encodeURIComponent(uniqueFilename);
      const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${encodedFilename}`;
      
      // Generate internal S3 URL for backend processing
      const s3Url = `s3://${bucketName}/${uniqueFilename}`;

      // Return response in the same format as Vercel Blob
      // Use s3:// URL for non-image files to ensure proper backend processing
      const isImage = contentType.startsWith('image/');
      const data = {
        url: isImage ? publicUrl : s3Url, // Use s3:// URL for documents, public URL for images
        pathname: uniqueFilename,
        contentType: contentType, // Use the corrected content type
        originalName: originalFilename, // Include original name for reference
        publicUrl: publicUrl, // Always include public URL for reference
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
