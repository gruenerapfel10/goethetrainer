import { storage } from './config';
import { adminStorage } from './admin';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Client-side upload function
export async function uploadFile(file: Blob, fileName: string, folder: string = 'uploads'): Promise<string> {
  const sanitizedFileName = sanitizeFilename(fileName);
  const fileRef = ref(storage, `${folder}/${uuidv4()}_${sanitizedFileName}`);
  
  const snapshot = await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
}

// Server-side functions using admin SDK
export async function uploadFileAdmin(fileBuffer: Buffer, fileName: string, folder: string = 'uploads'): Promise<{
  downloadURL: string;
  filePath: string;
}> {
  const sanitizedFileName = sanitizeFilename(fileName);
  const filePath = `${folder}/${uuidv4()}_${sanitizedFileName}`;
  
  const file = adminStorage.bucket().file(filePath);
  
  await file.save(fileBuffer, {
    metadata: {
      contentType: getMimeType(fileName),
    },
  });
  
  // Make file publicly readable
  await file.makePublic();
  
  const downloadURL = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${filePath}`;
  
  return { downloadURL, filePath };
}

export async function getFileContent(filePath: string): Promise<Buffer> {
  const file = adminStorage.bucket().file(filePath);
  const [buffer] = await file.download();
  return buffer;
}

export async function getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  const file = adminStorage.bucket().file(filePath);
  
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresIn * 1000,
  });
  
  return signedUrl;
}

export async function deleteFile(filePath: string): Promise<void> {
  const file = adminStorage.bucket().file(filePath);
  await file.delete();
}

// Helper functions
function sanitizeFilename(filename: string): string {
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-zA-Z0-9\-\.\(\)]/g, '_') // Replace non-ASCII with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}

function getMimeType(filename: string): string {
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
  
  return mimeMap[ext || ''] || 'application/octet-stream';
}

// Parse Firebase Storage URLs
export function parseFirebaseUrl(url: string): { bucket: string; filePath: string } | null {
  try {
    // Handle Firebase Storage URLs
    if (url.includes('firebasestorage.googleapis.com')) {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucket = pathParts[2]; // /v0/b/{bucket}/o/{path}
      const encodedPath = pathParts.slice(4).join('/'); // Skip /v0/b/{bucket}/o/
      const filePath = decodeURIComponent(encodedPath.replace(/\?.*$/, '')); // Remove query params
      return { bucket, filePath };
    }
    
    // Handle Google Cloud Storage URLs
    if (url.includes('storage.googleapis.com')) {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.substring(1).split('/');
      const bucket = pathParts[0];
      const filePath = pathParts.slice(1).join('/');
      return { bucket, filePath };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing Firebase URL:', error);
    return null;
  }
}