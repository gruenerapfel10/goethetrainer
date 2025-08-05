import { tool } from 'ai';
import { z } from 'zod';
import type { Session } from '@/types/next-auth';
import type { DataStreamWriter } from 'ai';
import type { UIMessage } from 'ai';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fetch from 'node-fetch';
import { generateUUID, messagesWithoutFiles } from '@/lib/utils';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

interface ProcessFileProps {
  session: Session;
  dataStream: DataStreamWriter;
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
    .replace(/[^a-zA-Z0-9\s\-\(\)\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!sanitized || sanitized.length < 1) {
    sanitized = 'document';
  }

  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100).trim();
  }

  return sanitized;
}

// Helper function to parse S3 URLs and generate presigned URLs
function parseS3Url(s3Url: string): { bucketName: string; key: string } | null {
  try {
    if (s3Url.startsWith('s3://')) {
      const urlParts = s3Url.replace('s3://', '').split('/');
      const bucketName = urlParts[0];
      const key = urlParts.slice(1).join('/');
      return { bucketName, key };
    } else if (s3Url.startsWith('https://')) {
      const url = new URL(s3Url);

      if (
        url.hostname.includes('.s3.') &&
        url.hostname.includes('.amazonaws.com')
      ) {
        const bucketName = url.hostname.split('.s3.')[0];
        const key = url.pathname.substring(1);
        return { bucketName, key };
      }

      if (
        url.hostname.startsWith('s3.') &&
        url.hostname.includes('.amazonaws.com')
      ) {
        const pathParts = url.pathname.substring(1).split('/');
        const bucketName = pathParts[0];
        const key = pathParts.slice(1).join('/');
        return { bucketName, key };
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing S3 URL:', error);
    return null;
  }
}

// Initialize S3 client (still needed for file access)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper function to get presigned URL or return the original URL if it's not an S3 URL
async function getAccessibleUrl(fileUrl: string): Promise<string> {
  const s3Info = parseS3Url(fileUrl);

  if (!s3Info) {
    return fileUrl;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: s3Info.bucketName,
      Key: s3Info.key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    return presignedUrl;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error(
      `Failed to generate presigned URL for file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

// Helper function to read file content as text (for text-based files)
async function readFileAsText(fileUrl: string): Promise<string> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  return await response.text();
}

export const processFile = ({ session, dataStream }: ProcessFileProps) => {
  const processMultipleFiles = async (
    messages: Array<UIMessage>,
    baseSystemPrompt = '',
  ): Promise<ProcessFilesResult> => {
    const fileAnalysisResults: string[] = [];
    let hasProcessedFiles = false;

    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      return {
        fileAnalysisResults,
        enhancedSystemPrompt: () => baseSystemPrompt,
        hasProcessedFiles,
      };
    }

    const files = userMessage.experimental_attachments || [];

    if (files.length === 0) {
      return {
        fileAnalysisResults,
        enhancedSystemPrompt: () => baseSystemPrompt,
        hasProcessedFiles,
      };
    }

    const userText =
      userMessage.parts.find((part) => part.type === 'text')?.text || '';

    // Process each file
    const fileProcessor = tool({
      description:
        'Process a file using Google Gemini to analyze its content and extract information.',
      parameters: z.object({
        fileUrl: z.string().describe('URL of the file to process'),
        fileName: z.string().describe('Name of the file'),
        fileType: z.string().describe('MIME type of the file'),
        analysisPrompt: z
          .string()
          .optional()
          .describe('Optional prompt to guide the analysis'),
      }),
      execute: async ({
        fileUrl,
        fileName,
        fileType,
        analysisPrompt = 'Analyze this file and extract key information',
      }) => {
        try {
          const id = generateUUID();

          dataStream.writeData({
            type: 'id',
            content: id,
          });

          dataStream.writeData({
            type: 'fileName',
            content: fileName,
          });

          dataStream.writeData({
            type: 'status',
            content: 'processing',
          });

          const accessibleUrl = await getAccessibleUrl(fileUrl);
          console.log('Processing file:', fileName, 'Type:', fileType);

          let analysisResult = '';

          // For text-based files, read content and analyze with Gemini
          if (
            fileType.startsWith('text/') ||
            fileType === 'application/json' ||
            fileType === 'application/xml'
          ) {
            const fileContent = await readFileAsText(accessibleUrl);
            
            const { text } = await generateText({
              model: google('gemini-2.5-flash'),
              prompt: `${analysisPrompt}

File: ${fileName}
Content:
${fileContent}

Please provide a comprehensive analysis of this file.`,
            });

            analysisResult = text;
          } else {
            // For other file types, provide basic information
            analysisResult = `File: ${fileName}
Type: ${fileType}
Status: File uploaded successfully but detailed content analysis is not available for this file type with current Gemini implementation.

Note: For comprehensive document analysis, please use text-based formats (TXT, JSON, XML, etc.).`;
          }

          dataStream.writeData({
            type: 'content',
            content: analysisResult,
          });

          dataStream.writeData({
            type: 'status',
            content: 'complete',
          });

          dataStream.writeData({
            type: 'finish',
            content: analysisResult,
          });

          return {
            id,
            fileName,
            fileType,
            analysis: analysisResult,
            message: 'File processed successfully',
          };
        } catch (error: any) {
          console.error('Error processing file:', error);

          dataStream.writeData({
            type: 'status',
            content: 'error',
          });

          dataStream.writeData({
            type: 'error',
            content: error.message,
          });

          dataStream.writeData({
            type: 'finish',
            content: '',
          });

          return {
            error: error.message,
            message: 'Failed to process file',
          };
        }
      },
    });

    // Process each file
    for (const file of files) {
      try {
        const result = await fileProcessor.execute(
          {
            fileUrl: file.url,
            fileName: file.name || 'unnamed-file',
            fileType: file.contentType || 'application/octet-stream',
            analysisPrompt: userText
              ? `Analyze this ${
                  file.name || 'file'
                } and prepare to answer: "${userText}"`
              : `Analyze this ${
                  file.name || 'file'
                } and extract key information.`,
          },
          {
            abortSignal: undefined,
            toolCallId: generateUUID(),
            messages: messagesWithoutFiles(messages),
          },
        );

        if (result?.analysis) {
          fileAnalysisResults.push(
            `Analysis of ${file.name}:\n${result.analysis}`,
          );
          hasProcessedFiles = true;
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        dataStream.writeData({
          type: 'error',
          content: `Failed to process file ${file.name}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        });
      }
    }

    const enhancedSystemPrompt = (basePrompt: string): string => {
      if (!hasProcessedFiles || fileAnalysisResults.length === 0) {
        return basePrompt;
      }

      return `${basePrompt}
      
The following files have been analyzed for you:

${fileAnalysisResults.join('\n\n')}

Use this analysis to answer the user's query. If the user asks about specific content in the documents, 
refer to the analysis results. Be specific and cite information from the documents when possible.`;
    };

    return {
      fileAnalysisResults,
      enhancedSystemPrompt,
      hasProcessedFiles,
    };
  };

  // Return the tool instance with processMultipleFiles function
  const toolInstance = tool({
    description:
      'Process a file using Google Gemini to analyze its content and extract information.',
    parameters: z.object({
      fileUrl: z.string().describe('URL of the file to process'),
      fileName: z.string().describe('Name of the file'),
      fileType: z.string().describe('MIME type of the file'),
      analysisPrompt: z
        .string()
        .optional()
        .describe('Optional prompt to guide the analysis'),
    }),
    execute: async ({
      fileUrl,
      fileName,
      fileType,
      analysisPrompt = 'Analyze this file and extract key information',
    }) => {
      try {
        const id = generateUUID();

        dataStream.writeData({
          type: 'id',
          content: id,
        });

        dataStream.writeData({
          type: 'fileName',
          content: fileName,
        });

        dataStream.writeData({
          type: 'status',
          content: 'processing',
        });

        const accessibleUrl = await getAccessibleUrl(fileUrl);

        let analysisResult = '';

        // For text-based files, read content and analyze with Gemini
        if (
          fileType.startsWith('text/') ||
          fileType === 'application/json' ||
          fileType === 'application/xml'
        ) {
          const fileContent = await readFileAsText(accessibleUrl);
          
          const { text } = await generateText({
            model: google('gemini-2.5-flash'),
            prompt: `${analysisPrompt}

File: ${fileName}
Content:
${fileContent}

Please provide a comprehensive analysis of this file.`,
          });

          analysisResult = text;
        } else {
          // For other file types, provide basic information
          analysisResult = `File: ${fileName}
Type: ${fileType}
Status: File uploaded successfully but detailed content analysis is not available for this file type with current Gemini implementation.

Note: For comprehensive document analysis, please use text-based formats (TXT, JSON, XML, etc.).`;
        }

        dataStream.writeData({
          type: 'status',
          content: 'complete',
        });

        dataStream.writeData({
          type: 'finish',
          content: '',
        });

        return {
          id,
          fileName,
          fileType,
          analysis: analysisResult,
          message: 'File processed successfully',
        };
      } catch (error: any) {
        console.error('Error processing file:', error);

        dataStream.writeData({
          type: 'status',
          content: 'error',
        });

        dataStream.writeData({
          type: 'error',
          content: error.message,
        });

        dataStream.writeData({
          type: 'finish',
          content: '',
        });

        return {
          error: error.message,
          message: 'Failed to process file',
        };
      }
    },
  });

  const enhancedTool = Object.assign(toolInstance, { processMultipleFiles });

  return enhancedTool;
};