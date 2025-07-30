/**
 * File utility functions
 * Enhanced file type detection and handling
 */

export const SUPPORTED_FILE_TYPES = {
  // Images
  'image/jpeg': { ext: 'jpg', category: 'image' },
  'image/jpg': { ext: 'jpg', category: 'image' },
  'image/png': { ext: 'png', category: 'image' },
  'image/gif': { ext: 'gif', category: 'image' },
  'image/webp': { ext: 'webp', category: 'image' },
  'image/svg+xml': { ext: 'svg', category: 'image' },
  'image/bmp': { ext: 'bmp', category: 'image' },
  'image/ico': { ext: 'ico', category: 'image' },
  'image/heic': { ext: 'heic', category: 'image' },
  'image/heif': { ext: 'heif', category: 'image' },
  
  // Documents
  'application/pdf': { ext: 'pdf', category: 'document' },
  'application/msword': { ext: 'doc', category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', category: 'document' },
  'application/vnd.ms-excel': { ext: 'xls', category: 'spreadsheet' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', category: 'spreadsheet' },
  'application/vnd.ms-powerpoint': { ext: 'ppt', category: 'presentation' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'pptx', category: 'presentation' },
  'text/csv': { ext: 'csv', category: 'spreadsheet' },
  
  // Code
  'text/plain': { ext: 'txt', category: 'text' },
  'text/markdown': { ext: 'md', category: 'text' },
  'text/x-python': { ext: 'py', category: 'code' },
  'text/javascript': { ext: 'js', category: 'code' },
  'text/typescript': { ext: 'ts', category: 'code' },
  'text/x-java-source': { ext: 'java', category: 'code' },
  'text/x-c': { ext: 'c', category: 'code' },
  'text/x-c++': { ext: 'cpp', category: 'code' },
  'text/html': { ext: 'html', category: 'code' },
  'text/css': { ext: 'css', category: 'code' },
  'application/json': { ext: 'json', category: 'code' },
  'application/xml': { ext: 'xml', category: 'code' },
  'text/x-yaml': { ext: 'yaml', category: 'code' },
  
  // Archives
  'application/zip': { ext: 'zip', category: 'archive' },
  'application/x-rar-compressed': { ext: 'rar', category: 'archive' },
  'application/x-7z-compressed': { ext: '7z', category: 'archive' },
  'application/x-tar': { ext: 'tar', category: 'archive' },
  'application/gzip': { ext: 'gz', category: 'archive' },
  
  // Media
  'video/mp4': { ext: 'mp4', category: 'video' },
  'video/webm': { ext: 'webm', category: 'video' },
  'video/ogg': { ext: 'ogv', category: 'video' },
  'video/quicktime': { ext: 'mov', category: 'video' },
  'video/x-msvideo': { ext: 'avi', category: 'video' },
  'audio/mpeg': { ext: 'mp3', category: 'audio' },
  'audio/ogg': { ext: 'ogg', category: 'audio' },
  'audio/wav': { ext: 'wav', category: 'audio' },
  'audio/webm': { ext: 'weba', category: 'audio' },
};

export function getFileCategory(mimeType: string): string {
  const fileType = SUPPORTED_FILE_TYPES[mimeType];
  return fileType?.category || 'unknown';
}

export function isImageFile(mimeType: string): boolean {
  return getFileCategory(mimeType) === 'image';
}

export function isVideoFile(mimeType: string): boolean {
  return getFileCategory(mimeType) === 'video';
}

export function isAudioFile(mimeType: string): boolean {
  return getFileCategory(mimeType) === 'audio';
}

export function isDocumentFile(mimeType: string): boolean {
  const category = getFileCategory(mimeType);
  return category === 'document' || category === 'spreadsheet' || category === 'presentation';
}

export function isCodeFile(mimeType: string): boolean {
  const category = getFileCategory(mimeType);
  return category === 'code' || category === 'text';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function validateFileType(file: File): { valid: boolean; error?: string } {
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size exceeds 100MB limit (${formatFileSize(file.size)})` 
    };
  }
  
  if (!SUPPORTED_FILE_TYPES[file.type]) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${file.type}` 
    };
  }
  
  return { valid: true };
}

export function generateFileId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}-${Date.now()}`;
}