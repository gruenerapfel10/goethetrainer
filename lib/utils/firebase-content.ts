import { getFileContent, parseFirebaseUrl } from '@/lib/firebase/storage-utils';

export interface FileContentResult {
  content: string;
  mimeType: string;
  size: number;
}

export async function getFirebaseFileContent(url: string): Promise<FileContentResult> {
  try {
    // Parse Firebase Storage URL
    const parsedUrl = parseFirebaseUrl(url);
    if (!parsedUrl) {
      throw new Error(`Invalid Firebase Storage URL: ${url}`);
    }
    
    // Get file content from Firebase Storage
    const fileBuffer = await getFileContent(parsedUrl.filePath);
    
    // Determine MIME type from file extension
    const fileName = parsedUrl.filePath.split('/').pop() || '';
    const mimeType = getMimeTypeFromFileName(fileName);
    
    // Convert buffer to string based on MIME type
    let content: string;
    
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      content = fileBuffer.toString('utf-8');
    } else if (mimeType === 'application/pdf') {
      // For PDF files, we'd need a PDF parser library
      content = `[PDF File: ${fileName}] - Binary content (${fileBuffer.length} bytes)`;
    } else if (mimeType.startsWith('image/')) {
      content = `[Image File: ${fileName}] - Binary image content (${fileBuffer.length} bytes)`;
    } else {
      content = `[Binary File: ${fileName}] - Binary content (${fileBuffer.length} bytes)`;
    }
    
    return {
      content,
      mimeType,
      size: fileBuffer.length,
    };
    
  } catch (error) {
    console.error('Error getting Firebase file content:', error);
    throw new Error(`Failed to get file content: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function getMimeTypeFromFileName(filename: string): string {
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