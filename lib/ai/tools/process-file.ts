import { tool } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import type { DataStreamWriter } from 'ai';
import type { UIMessage } from 'ai';
import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fetch from 'node-fetch';
import { generateUUID, messagesWithoutFiles } from '@/lib/utils';

interface ProcessFileProps {
  session: Session;
  dataStream: DataStreamWriter;
  bedrockClient?: BedrockRuntimeClient;
}

interface ProcessFilesResult {
  fileAnalysisResults: string[];
  enhancedSystemPrompt: (baseSystemPrompt: string) => string;
  hasProcessedFiles: boolean;
}

// Helper function to sanitize filenames for AWS Bedrock compatibility
function sanitizeFilename(filename: string): string {
  // First decode any URL encoding
  let sanitized = decodeURIComponent(filename);

  // Remove or replace characters not allowed by AWS Bedrock
  // Allowed: alphanumeric, whitespace, hyphens, parentheses, and square brackets
  sanitized = sanitized
    .replace(/[^a-zA-Z0-9\s\-\(\)\[\]]/g, '') // Remove invalid characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace

  // If the result is empty or too short, provide a fallback
  if (!sanitized || sanitized.length < 1) {
    sanitized = 'document';
  }

  // Ensure it doesn't exceed reasonable length limits
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100).trim();
  }

  return sanitized;
}

// Helper function to parse S3 URLs and generate presigned URLs
function parseS3Url(s3Url: string): { bucketName: string; key: string } | null {
  try {
    // Handle both s3:// and https:// formats
    if (s3Url.startsWith('s3://')) {
      const urlParts = s3Url.replace('s3://', '').split('/');
      const bucketName = urlParts[0];
      const key = urlParts.slice(1).join('/');
      return { bucketName, key };
    } else if (s3Url.startsWith('https://')) {
      const url = new URL(s3Url);

      // Handle format: https://bucket-name.s3.region.amazonaws.com/key
      if (
        url.hostname.includes('.s3.') &&
        url.hostname.includes('.amazonaws.com')
      ) {
        const bucketName = url.hostname.split('.s3.')[0];
        const key = url.pathname.substring(1); // Remove leading slash
        return { bucketName, key };
      }

      // Handle format: https://s3.region.amazonaws.com/bucket-name/key
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

// Initialize AWS clients
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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
    // Not an S3 URL, return as-is (could be a public URL or presigned URL)
    return fileUrl;
  }

  try {
    // Generate presigned URL for S3 file
    const command = new GetObjectCommand({
      Bucket: s3Info.bucketName,
      Key: s3Info.key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
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

export const processFile = ({ session, dataStream }: ProcessFileProps) => {
  const client = bedrockClient;

  const processMultipleFiles = async (
    messages: Array<UIMessage>,
    baseSystemPrompt = '',
  ): Promise<ProcessFilesResult> => {
    const fileAnalysisResults: string[] = [];
    let hasProcessedFiles = false;

    // Get the most recent user message
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      return {
        fileAnalysisResults,
        enhancedSystemPrompt: () => baseSystemPrompt,
        hasProcessedFiles,
      };
    }

    // Check if there are file attachments in the user message
    const files = userMessage.experimental_attachments || [];

    if (files.length === 0) {
      return {
        fileAnalysisResults,
        enhancedSystemPrompt: () => baseSystemPrompt,
        hasProcessedFiles,
      };
    }

    // Get the user's text message if any
    const userText =
      userMessage.parts.find((part) => part.type === 'text')?.text || '';

    // Process each file
    const fileProcessor = tool({
      description:
        'Process a file using AWS Bedrock to analyze its content and extract information.',
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

          // Notify client that processing has started
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

          // Get accessible URL (presigned if S3, original if not)
          const accessibleUrl = await getAccessibleUrl(fileUrl);
          console.log('Original fileUrl:', fileUrl);
          console.log('Accessible URL:', accessibleUrl);

          // Fetch the file from the accessible URL
          const response = await fetch(accessibleUrl);
          console.log('Response status:', response.status);
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }

          const fileBuffer = await response.arrayBuffer();
          const fileBytes = new Uint8Array(fileBuffer);

          // Sanitize the filename for AWS Bedrock compatibility
          const sanitizedFileName = sanitizeFilename(fileName);

          // Create a timestamp suffix for unique filenames
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileNameParts = sanitizedFileName.split('.');
          const extension = fileNameParts.pop() || '';
          const baseName = fileNameParts.join('.');
          const uniqueFileName = `${baseName}_${timestamp}`;

          // Prepare content blocks based on file type
          const contentBlocks = [];

          // Add the analysis prompt as text
          contentBlocks.push({ text: analysisPrompt });

          // Add the file as appropriate content type
          if (fileType.startsWith('image/')) {
            const format = fileType.split('/')[1];
            contentBlocks.push({
              image: {
                format: format as 'png' | 'jpeg' | 'gif' | 'webp',
                source: {
                  bytes: fileBytes,
                },
              },
            });
          } else {
            // Determine document format based on file type
            let format = 'txt';
            if (fileType === 'application/pdf') format = 'pdf';
            else if (fileType === 'text/csv') format = 'csv';
            else if (fileType === 'application/msword') format = 'doc';
            else if (
              fileType ===
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
              format = 'docx';
            else if (fileType === 'application/vnd.ms-excel') format = 'xls';
            else if (
              fileType ===
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
              format = 'xlsx';
            else if (fileType === 'text/html') format = 'html';
            else if (fileType === 'text/markdown') format = 'md';

            contentBlocks.push({
              document: {
                format: format as
                  | 'pdf'
                  | 'csv'
                  | 'doc'
                  | 'docx'
                  | 'xls'
                  | 'xlsx'
                  | 'html'
                  | 'txt'
                  | 'md',
                name: uniqueFileName,
                source: {
                  bytes: fileBytes,
                },
              },
            });
          }

          // Create the input for the ConverseStreamCommand with enhanced API features
          const input = {
            modelId: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
            messages: [
              {
                role: 'user',
                content: contentBlocks,
              },
            ],
            system: [
              {
                text: `You are a document analysis assistant. Your task is to:
                1. Analyze the provided document thoroughly
                2. Extract key information, facts, and insights
                3. Organize the information in a structured way
                4. Focus on addressing: ${analysisPrompt}
                
                Be comprehensive but concise. Your analysis will be used to answer questions about this document.`,
              },
            ],
            inferenceConfig: {
              maxTokens: 8192,
              temperature: 0.3,
              topP: 0.7,
              topK: 40,
              stopSequences: [],
            },
            // Add request metadata for tracking
            requestMetadata: {
              userId: session?.user?.id || 'anonymous',
              operation: 'file-analysis',
              fileType: fileType,
              timestamp: new Date().toISOString(),
            },
            // Add additional model response field paths if needed
            additionalModelResponseFieldPaths: [
              '/stopReason',
              '/usage',
              '/metrics'
            ],
          };

          const command = new ConverseStreamCommand(input as any);
          const bedrockResponse = await client.send(command);

          let accumulatedResponse = '';
          let stopReason = '';
          let usage = null;
          let metrics = null;

          // Process the stream with enhanced event handling
          for await (const event of bedrockResponse.stream as AsyncIterable<any>) {
            try {
              // Handle different event types according to new API structure
              if (event.messageStart) {
                // Handle message start event
                const role = event.messageStart.role;
                dataStream.writeData({
                  type: 'messageStart',
                  role: role,
                });
              } else if (event.contentBlockStart) {
                // Handle content block start
                const index = event.contentBlockStart.contentBlockIndex;
                dataStream.writeData({
                  type: 'contentBlockStart',
                  index: index,
                });
              } else if (event.contentBlockDelta) {
                // Handle content block delta (text chunks)
                const delta = event.contentBlockDelta.delta;
                if (delta.text) {
                  accumulatedResponse += delta.text;
                  dataStream.writeData({
                    type: 'content',
                    content: delta.text,
                    contentBlockIndex: event.contentBlockDelta.contentBlockIndex,
                  });
                } else if (delta.reasoningContent) {
                  // Handle reasoning content if present
                  dataStream.writeData({
                    type: 'reasoning',
                    content: delta.reasoningContent,
                    contentBlockIndex: event.contentBlockDelta.contentBlockIndex,
                  });
                }
              } else if (event.contentBlockStop) {
                // Handle content block stop
                dataStream.writeData({
                  type: 'contentBlockStop',
                  index: event.contentBlockStop.contentBlockIndex,
                });
              } else if (event.messageStop) {
                // Handle message stop event
                stopReason = event.messageStop.stopReason;
                dataStream.writeData({
                  type: 'messageStop',
                  stopReason: stopReason,
                });
              } else if (event.metadata) {
                // Handle metadata event with usage and metrics
                usage = event.metadata.usage;
                metrics = event.metadata.metrics;
                dataStream.writeData({
                  type: 'metadata',
                  usage: usage,
                  metrics: metrics,
                });
              }
            } catch (error) {
              console.error('Error processing event:', error);
            }
          }

          // Notify client that processing is complete with enhanced metadata
          dataStream.writeData({
            type: 'status',
            content: 'complete',
            stopReason: stopReason,
            usage: usage,
            metrics: metrics,
          });

          dataStream.writeData({
            type: 'finish',
            content: accumulatedResponse,
            metadata: {
              stopReason: stopReason,
              usage: usage,
              metrics: metrics,
              fileInfo: {
                fileName: fileName,
                fileType: fileType,
                processingTime: metrics?.latencyMs || 0,
              }
            }
          });

          return {
            id,
            fileName,
            fileType,
            analysis: accumulatedResponse,
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
        // Call the tool function directly with appropriate analysis prompt
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
            // Second parameter with tool execution options
            abortSignal: undefined,
            toolCallId: generateUUID(),
            messages: messagesWithoutFiles(messages),
          },
        );

        // Store the analysis result to include in the context
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

    // Create an enhanced system prompt function
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
      'Process a file using AWS Bedrock to analyze its content and extract information.',
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

        // Notify client that processing has started
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

        const response = await fetch(accessibleUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const fileBuffer = await response.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        const sanitizedFileName = sanitizeFilename(fileName);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileNameParts = sanitizedFileName.split('.');
        const extension = fileNameParts.pop() || '';
        const baseName = fileNameParts.join('.');
        const uniqueFileName = `${baseName}_${timestamp}`;

        const contentBlocks = [];

        contentBlocks.push({ text: analysisPrompt });

        if (fileType.startsWith('image/')) {
          const format = fileType.split('/')[1];
          contentBlocks.push({
            image: {
              format: format as 'png' | 'jpeg' | 'gif' | 'webp',
              source: {
                bytes: fileBytes,
              },
            },
          });
        } else {
          // Determine document format based on file type
          let format = 'txt';
          if (fileType === 'application/pdf') format = 'pdf';
          else if (fileType === 'text/csv') format = 'csv';
          else if (fileType === 'application/msword') format = 'doc';
          else if (
            fileType ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          )
            format = 'docx';
          else if (fileType === 'application/vnd.ms-excel') format = 'xls';
          else if (
            fileType ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          )
            format = 'xlsx';
          else if (fileType === 'text/html') format = 'html';
          else if (fileType === 'text/markdown') format = 'md';

          contentBlocks.push({
            document: {
              format: format as
                | 'pdf'
                | 'csv'
                | 'doc'
                | 'docx'
                | 'xls'
                | 'xlsx'
                | 'html'
                | 'txt'
                | 'md',
              name: uniqueFileName,
              source: {
                bytes: fileBytes,
              },
            },
          });
        }

        const input = {
          modelId: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
          messages: [
            {
              role: 'user',
              content: contentBlocks,
            },
          ],
          system: [
            {
              text: `You are a document analysis assistant. Your task is to:
              1. Analyze the provided document thoroughly
              2. Extract key information, facts, and insights
              3. Organize the information in a structured way
              4. Focus on addressing: ${analysisPrompt}
              
              Be comprehensive but concise. Your analysis will be used to answer questions about this document.`,
            },
          ],
          inferenceConfig: {
            maxTokens: 8192,
            temperature: 0.3,
            topP: 0.7,
            topK: 40,
            stopSequences: [],
          },
          // Add request metadata for tracking
          requestMetadata: {
            userId: session?.user?.id || 'anonymous',
            operation: 'single-file-analysis',
            fileType: fileType,
            timestamp: new Date().toISOString(),
          },
          // Add additional model response field paths
          additionalModelResponseFieldPaths: [
            '/stopReason',
            '/usage',
            '/metrics'
          ],
        };

        const command = new ConverseStreamCommand(input as any);
        const bedrockResponse = await client.send(command);

        let accumulatedResponse = '';
        let stopReason = '';
        let usage = null;
        let metrics = null;

        // Process the stream with enhanced event handling
        for await (const event of bedrockResponse.stream as AsyncIterable<any>) {
          try {
            // Handle different event types according to new API structure
            if (event.messageStart) {
              // Message started
              console.log('Analysis started for file:', fileName);
            } else if (event.contentBlockDelta) {
              // Handle content block delta (text chunks)
              const delta = event.contentBlockDelta.delta;
              if (delta.text) {
                accumulatedResponse += delta.text;
                // Stream the chunk to the client
                dataStream.writeData({
                  type: 'content',
                  content: delta.text,
                  contentBlockIndex: event.contentBlockDelta.contentBlockIndex,
                });
              }
            } else if (event.messageStop) {
              // Handle message stop event
              stopReason = event.messageStop.stopReason;
            } else if (event.metadata) {
              // Handle metadata event with usage and metrics
              usage = event.metadata.usage;
              metrics = event.metadata.metrics;
              console.log('File analysis completed:', {
                fileName,
                stopReason,
                inputTokens: usage?.inputTokens,
                outputTokens: usage?.outputTokens,
                latencyMs: metrics?.latencyMs
              });
            }
          } catch (error) {
            console.error('Error processing chunk:', error);
          }
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
          analysis: accumulatedResponse,
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
