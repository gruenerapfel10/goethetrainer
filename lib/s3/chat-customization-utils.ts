import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Use the dedicated logo bucket name
const BUCKET_NAME = process.env.LOGO_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME;

// Log the bucket name to debug

export async function listLogos() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.LOGO_S3_BUCKET_NAME!,
      Prefix: '',
    });

    const { Contents = [] } = await s3Client.send(command);

    const files = await Promise.all(
      Contents.map(async (item) => {
        if (!item.Key) return null;

        const getCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: item.Key,
        });

        const url = await getSignedUrl(s3Client, getCommand, {
          expiresIn: 86400,
        }); // 24 hours

        return {
          key: item.Key,
          url,
          lastModified: item.LastModified,
          size: item.Size,
          type:
            item.Key.split('.').pop()?.toLowerCase() === 'svg'
              ? 'image/svg+xml'
              : `image/${item.Key.split('.').pop()?.toLowerCase() || 'png'}`,
        };
      }),
    );

    return { files: files.filter(Boolean) };
  } catch (error) {
    console.error('Error listing S3 objects:', error);
    throw error;
  }
}

export async function getLogo(key: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 86400 }); // 24 hours

    return { url };
  } catch (error) {
    console.error('Error getting S3 object:', error);
    throw error;
  }
}

export async function uploadLogo(
  file: Buffer,
  filename: string,
  contentType: string,
) {
  try {
    // Create a sanitized filename to avoid S3 key issues
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${Date.now()}-${sanitizedFilename}`;


    const command = new PutObjectCommand({
      Bucket: process.env.LOGO_S3_BUCKET_NAME!,
      Key: key,
      Body: file,
      ContentType: contentType,
      
    });

    await s3Client.send(command);

    // Create a public URL for the uploaded file
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return {
      key,
      url: publicUrl,
      name: sanitizedFilename,
      uploadedAt: Date.now(),
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

export async function deleteLogo(key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    return { success: true };
  } catch (error) {
    console.error('Error deleting S3 object:', error);
    throw error;
  }
}