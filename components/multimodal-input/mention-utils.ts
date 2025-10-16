import type { UIMessage } from 'ai';
import { AttachmentType } from '@/contexts/chat-context';
import React from 'react';

type Attachment = {
  url?: string;
  name?: string;
  contentType?: string;
  size?: number;
  type?: AttachmentType;
  content?: string;
  thumbnailUrl?: string;
  metadata?: any;
};

// Optimized file data management
export class FileDataManager {
  private fileMap = new Map<string, { url: string }>();
  private availableFiles: string[] = [];

  constructor(
    attachments: Array<Attachment>,
    messages: Array<UIMessage>
  ) {
    this.initializeFiles(attachments, messages);
  }

  private initializeFiles(
    attachments: Array<Attachment>,
    messages: Array<UIMessage>
  ): void {
    // Add current attachments (both user files and KB files)
    attachments.forEach(file => {
      if (file.name) {
        this.fileMap.set(file.name, { url: file.url || '' });
      }
    });

    // Add historical attachments from messages
    messages.forEach(message => {
      (message as any).experimental_attachments?.forEach((attachment: any) => {
        if (attachment.name && attachment.url) {
          this.fileMap.set(attachment.name, { url: attachment.url });
        }
      });
    });

    // Cache available files list
    this.availableFiles = Array.from(this.fileMap.keys());
  }

  getFileMap(): Map<string, { url: string }> {
    return this.fileMap;
  }

  getAvailableFiles(): string[] {
    return this.availableFiles;
  }

  filterFiles(query: string): string[] {
    if (!query) return this.availableFiles;
    
    const lowerQuery = query.toLowerCase();
    return this.availableFiles.filter(file =>
      file.toLowerCase().startsWith(lowerQuery)
    );
  }

  getFileUrl(fileName: string): string | undefined {
    return this.fileMap.get(fileName)?.url;
  }
}

// Legacy exports for backward compatibility
export const extractHistoricalFiles = (
  messages: Array<UIMessage>,
  attachments: Array<Attachment>
): Array<{ title: string; url: string; content?: string }> => {
  const allFiles = new Map<string, { title: string; url: string; content?: string }>();

  attachments.forEach(file => {
    if (file.name && file.url) {
      allFiles.set(file.name, {
        title: file.name,
        url: file.url,
        content: file.content
      });
    }
  });

  messages.forEach(message => {
    (message as any).experimental_attachments?.forEach((attachment: any) => {
      if (attachment.name && attachment.url && !allFiles.has(attachment.name)) {
        allFiles.set(attachment.name, {
          title: attachment.name,
          url: attachment.url,
          content: attachment.content || ''
        });
      }
    });
  });

  return Array.from(allFiles.values());
};

export const createFileMap = (
  attachments: Array<Attachment>,
  messages: Array<UIMessage>
): Map<string, { url: string }> => {
  const map = new Map<string, { url: string }>();
  
  // Add current attachments
  attachments.forEach(file => {
    if (file.name) map.set(file.name, { url: file.url || '' });
  });
  
  // Add historical attachments from messages
  messages.forEach(message => {
    (message as any).experimental_attachments?.forEach((attachment: any) => {
      if (attachment.name && attachment.url && !map.has(attachment.name)) {
        map.set(attachment.name, { url: attachment.url });
      }
    });
  });
  
  return map;
};

export const getAvailableFiles = (
  attachments: Array<Attachment>,
  messages: Array<UIMessage>
): string[] => {
  const files = new Set<string>();
  
  // Add current attachments
  attachments.forEach(a => a.name && files.add(a.name));
  
  // Add historical attachments
  messages.forEach(message => {
    (message as any).experimental_attachments?.forEach((attachment: any) => {
      if (attachment.name) files.add(attachment.name);
    });
  });
  
  return Array.from(files);
};

export const filterFiles = (availableFiles: string[], mentionQuery: string): string[] => {
  if (!mentionQuery) return availableFiles;
  
  const lowerQuery = mentionQuery.toLowerCase();
  return availableFiles.filter(file =>
    file.toLowerCase().startsWith(lowerQuery)
  );
};

/**
 * Renders text with @ mentions styled as pills
 * @param text The text containing @ mentions
 * @param fileMap Map of file names to URLs
 * @returns React elements with styled mentions
 */
export function renderTextWithMentions(
  text: string,
  fileMap: Map<string, string> | Map<string, { url: string }>
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let processedText = text;
  let key = 0;
  
  // First, convert any @filename mentions to @[filename] format if the file exists
  // This handles cases where the filename has spaces and wasn't properly bracketed
  Array.from(fileMap.keys()).forEach(fileName => {
    // Create a regex that matches @filename (with or without brackets)
    const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`@${escapedFileName}(?![\\w])`, 'g'), // @filename without brackets
      new RegExp(`@\\[${escapedFileName}\\]`, 'g'), // @[filename] with brackets
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(processedText)) {
        processedText = processedText.replace(pattern, `@[${fileName}]`);
      }
    });
  });
  
  // Now process the normalized text with @[filename] format
  const mentionPattern = /@\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(processedText)) !== null) {
    console.log('[renderTextWithMentions] Processing match:', match[0], 'filename:', match[1]);
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(
        React.createElement('span', { key: `text-${key++}` }, 
          processedText.slice(lastIndex, match.index)
        )
      );
    }

    // Extract filename from @[filename] format
    const fileName = match[1];
    // Handle both Map<string, string> and Map<string, { url: string }> formats
    const fileData = fileMap.get(fileName);
    const fileUrl = typeof fileData === 'string' ? fileData : fileData?.url || '';
    
    console.log('[renderTextWithMentions] Looking for file:', fileName, 'Found:', !!fileData, 'URL:', fileUrl);
    
    // Only render as mention pill if this is a valid file
    if (fileData) {
      // Add the mention as a styled pill with proper text contrast
      parts.push(
        React.createElement('span', {
          key: `mention-${key++}`,
          'data-mention': `@[${fileName}]`,
          'contentEditable': 'false',
          title: fileUrl,
          className: 'bg-orange-200/50 dark:bg-orange-800/50 text-white dark:text-black rounded-md px-1 cursor-pointer hover:underline',
          onClick: async (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (fileUrl) {
              try {
                const response = await fetch('/api/files/presigned-url', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ s3Url: fileUrl }),
                });
                if (response.ok) {
                  const data = await response.json();
                  if (data.presignedUrl) {
                    window.open(data.presignedUrl, '_blank', 'noopener,noreferrer');
                  }
                }
              } catch (error) {
                console.error('Error fetching presigned URL:', error);
              }
            }
          }
        }, `@${fileName}`)
      );
    } else {
      // If not a valid file, just render as plain text
      parts.push(
        React.createElement('span', { key: `text-${key++}` },
          match[0]
        )
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < processedText.length) {
    parts.push(
      React.createElement('span', { key: `text-${key++}` },
        processedText.slice(lastIndex)
      )
    );
  }

  return parts.length > 0 ? parts : [React.createElement('span', { key: 'text-0' }, text)];
}