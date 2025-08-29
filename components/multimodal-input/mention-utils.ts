import type { Attachment, UIMessage } from 'ai';
import type { FileSearchResult } from '@/components/chat-header';

// Optimized file data management
export class FileDataManager {
  private fileMap = new Map<string, { url: string }>();
  private availableFiles: string[] = [];

  constructor(
    attachments: Array<Attachment>,
    messages: Array<UIMessage>,
    selectedFiles: FileSearchResult[]
  ) {
    this.initializeFiles(attachments, messages, selectedFiles);
  }

  private initializeFiles(
    attachments: Array<Attachment>,
    messages: Array<UIMessage>,
    selectedFiles: FileSearchResult[]
  ): void {
    // Add current attachments
    attachments.forEach(file => {
      if (file.name) {
        this.fileMap.set(file.name, { url: file.url });
      }
    });

    // Add selected files
    selectedFiles.forEach(file => {
      if (file.title) {
        this.fileMap.set(file.title, { url: file.url });
      }
    });

    // Add historical attachments from messages
    messages.forEach(message => {
      message.experimental_attachments?.forEach((attachment: any) => {
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
  selectedFiles: FileSearchResult[]
): FileSearchResult[] => {
  const allFiles = new Map<string, FileSearchResult>();

  selectedFiles.forEach(file => allFiles.set(file.title, file));

  messages.forEach(message => {
    message.experimental_attachments?.forEach((attachment: any) => {
      if (attachment.name && attachment.url && !allFiles.has(attachment.name)) {
        allFiles.set(attachment.name, {
          title: attachment.name,
          url: attachment.url,
          content: '',
          sizeInBytes: 0,
        });
      }
    });
  });

  return Array.from(allFiles.values());
};

export const createFileMap = (
  attachments: Array<Attachment>,
  historicalFiles: FileSearchResult[]
): Map<string, { url: string }> => {
  const map = new Map<string, { url: string }>();
  
  attachments.forEach(file => {
    if (file.name) map.set(file.name, { url: file.url });
  });
  
  historicalFiles.forEach(file => {
    if (file.title) map.set(file.title, { url: file.url });
  });
  
  return map;
};

export const getAvailableFiles = (
  attachments: Array<Attachment>,
  historicalFiles: FileSearchResult[]
): string[] => {
  const files = new Set<string>();
  
  attachments.forEach(a => a.name && files.add(a.name));
  historicalFiles.forEach(f => f.title && files.add(f.title));
  
  return Array.from(files);
};

export const filterFiles = (availableFiles: string[], mentionQuery: string): string[] => {
  if (!mentionQuery) return availableFiles;
  
  const lowerQuery = mentionQuery.toLowerCase();
  return availableFiles.filter(file =>
    file.toLowerCase().startsWith(lowerQuery)
  );
};