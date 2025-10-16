import { z } from 'zod';
import { tool } from 'ai';
import type { Session } from 'next-auth';
import type { UIMessage } from 'ai';
import { generateUUID, messagesWithoutFiles } from '@/lib/utils';
import { getFileContent, parseFirebaseUrl } from '@/lib/firebase/storage-utils';
import { customModel } from '@/lib/ai/models';

interface ProcessFileProps {
  // No longer need AWS clients
}

interface ProcessFilesResult {
  fileAnalysisResults: string[];
  enhancedSystemPrompt: (baseSystemPrompt: string) => string;
  hasProcessedFiles: boolean;
}

// Helper function to sanitize filenames
function sanitizeFilename(filename: string): string {
  let sanitized = decodeURIComponent(filename);
  
  sanitized = sanitized
    .replace(/[^\w\s\-\.\(\)]/g, '') // Keep word chars, spaces, hyphens, dots, parentheses
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

  return sanitized;
}

// Process files using Firebase Storage
export async function processFiles(
  messages: UIMessage[],
  props: ProcessFileProps = {}
): Promise<ProcessFilesResult> {
  console.log('[processFiles] Starting file processing...');
  
  const fileAnalysisResults: string[] = [];
  
  // Extract files from messages
  const filesFromMessages = extractFilesFromMessages(messages);
  console.log(`[processFiles] Found ${filesFromMessages.length} files to process`);
  
  if (filesFromMessages.length === 0) {
    console.log('[processFiles] No files found in messages');
    return {
      fileAnalysisResults: [],
      enhancedSystemPrompt: (base) => base,
      hasProcessedFiles: false,
    };
  }
  
  // Process each file
  for (const fileInfo of filesFromMessages) {
    try {
      console.log(`[processFiles] Processing file: ${fileInfo.name} (${fileInfo.url})`);
      
      if (!fileInfo.url) {
        console.error(`[processFiles] File ${fileInfo.name} has no URL`);
        continue;
      }
      
      // Parse Firebase Storage URL
      const parsedUrl = parseFirebaseUrl(fileInfo.url);
      if (!parsedUrl) {
        console.error(`[processFiles] Could not parse Firebase URL: ${fileInfo.url}`);
        continue;
      }
      
      // Get file content from Firebase Storage
      const fileBuffer = await getFileContent(parsedUrl.filePath);
      console.log(`[processFiles] Downloaded file: ${fileInfo.name}, size: ${fileBuffer.length} bytes`);
      
      // Convert buffer to text for processing
      let fileContent = '';
      const contentType = fileInfo.contentType || 'text/plain';
      
      if (contentType.startsWith('text/') || contentType === 'application/json') {
        fileContent = fileBuffer.toString('utf-8');
      } else if (contentType === 'application/pdf') {
        // For PDF files, we'd need a PDF parser library
        fileContent = `[PDF File: ${fileInfo.name}] - Content extraction would require additional PDF parsing library`;
      } else {
        fileContent = `[Binary File: ${fileInfo.name}] - Content type: ${contentType}`;
      }
      
      // Generate analysis using AI model
      const analysisPrompt = `Analyze the following file content and provide a comprehensive summary:

File: ${fileInfo.name}
Content Type: ${contentType}
Size: ${fileBuffer.length} bytes

Content:
${fileContent.substring(0, 8000)} ${fileContent.length > 8000 ? '...(truncated)' : ''}

Please provide:
1. A brief summary of the file's purpose and content
2. Key information or data contained in the file
3. Any notable patterns, structures, or important details
4. How this file might be relevant to the user's questions or tasks`;

      const model = customModel('grok-4-fast-reasoning');
      const result = await model.doGenerate({
        inputFormat: 'messages',
        mode: {
          type: 'regular',
        },
        prompt: [
          {
            role: 'user',
            content: [{ type: 'text', text: analysisPrompt }],
          },
        ],
      });
      
      const analysis = result.text || 'Could not analyze file content';
      fileAnalysisResults.push(`File: ${fileInfo.name}\n${analysis}`);
      
      console.log(`[processFiles] Successfully analyzed file: ${fileInfo.name}`);
      
    } catch (error) {
      console.error(`[processFiles] Error processing file ${fileInfo.name}:`, error);
      fileAnalysisResults.push(`File: ${fileInfo.name}\nError: Could not process file - ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log(`[processFiles] Completed processing ${fileAnalysisResults.length} files`);
  
  // Create enhanced system prompt function
  const enhancedSystemPrompt = (baseSystemPrompt: string): string => {
    if (fileAnalysisResults.length === 0) return baseSystemPrompt;
    
    const fileAnalysisSection = `

## Attached Files Analysis

The user has attached the following files. Use this information to better understand their context and provide more relevant responses:

${fileAnalysisResults.join('\n\n---\n\n')}

## Instructions for File Usage

- Reference specific information from these files when relevant to the user's questions
- If asked about file contents, provide specific details from the analysis above
- Consider the file context when providing recommendations or solutions
- If files contain data, offer to help analyze, visualize, or work with that data`;

    return baseSystemPrompt + fileAnalysisSection;
  };
  
  return {
    fileAnalysisResults,
    enhancedSystemPrompt,
    hasProcessedFiles: fileAnalysisResults.length > 0,
  };
}

// Extract file information from messages
function extractFilesFromMessages(messages: UIMessage[]): Array<{
  name: string;
  url: string;
  contentType?: string;
}> {
  const files: Array<{ name: string; url: string; contentType?: string }> = [];
  
  for (const message of messages) {
    if (message.attachments && Array.isArray(message.attachments)) {
      for (const attachment of message.attachments) {
        if (attachment.url && attachment.name) {
          files.push({
            name: attachment.name,
            url: attachment.url,
            contentType: attachment.contentType,
          });
        }
      }
    }
  }
  
  return files;
}

// Create the processFile tool
export function processFile(): ReturnType<typeof tool> {
  return tool({
    description: 'Process and analyze uploaded files using Firebase Storage',
    parameters: z.object({
      fileUrls: z.array(z.string()).describe('Array of Firebase Storage URLs to process'),
      analysisType: z.enum(['summary', 'detailed', 'extract']).optional().describe('Type of analysis to perform'),
    }),
    execute: async ({ fileUrls, analysisType = 'summary' }) => {
      try {
        // For direct tool usage, create mock messages with file attachments
        const mockMessages: UIMessage[] = fileUrls.map(url => ({
          id: generateUUID(),
          role: 'user',
          content: '',
          attachments: [{
            url,
            name: url.split('/').pop() || 'unknown-file',
            contentType: 'application/octet-stream',
          }],
        }));
        
        const result = await processFiles(mockMessages);
        
        return {
          success: true,
          filesProcessed: result.fileAnalysisResults.length,
          analyses: result.fileAnalysisResults,
          hasFiles: result.hasProcessedFiles,
        };
        
      } catch (error) {
        console.error('[processFile tool] Error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          filesProcessed: 0,
          analyses: [],
          hasFiles: false,
        };
      }
    },
  });
}