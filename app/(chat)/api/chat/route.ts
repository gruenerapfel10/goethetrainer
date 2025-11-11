import { auth } from '@/app/(auth)/auth';
import { streamStandardAgent } from './standard-agent';
import { deleteChatById, getChatById, saveChat } from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '@/app/(chat)/actions';
import { myProvider } from '@/lib/ai/models';
import { cleanupOrphanedToolCalls, cleanupEmptyMessages } from '@/lib/utils/message-filter';
import type { FileSearchResult } from '@/components/chat-header';
import { getUserLocale } from '@/services/locale';
import type { UIMessage } from 'ai';
import type { AgentFeatures, AgentTools } from '@/contexts/chat-context';

type MessagePart = UIMessage['parts'] extends Array<infer P> ? P : never;

interface FileAttachment {
  url: string;
  name: string;
  contentType: string;
  size?: number;
  originalS3Url?: string;
}

interface StreamRequestPayload {
  messages: UIMessage[];
  id: string;
  selectedChatModel: string;
  selectedFiles: FileSearchResult[];
  systemQueue: string[] | null;
  attachments: FileAttachment[];
  agentTools: AgentTools;
  agentFeatures: AgentFeatures;
  urlMapping: Map<string, string>;
}

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    console.log('[api/chat] Received chat request');
    
    if (!json.data) {
      console.error('[api/chat] Invalid request format - no data');
      return new Response('Invalid request format', { status: 400 });
    }
    
    let attachments: FileAttachment[] = [];
    
    // Check if messages have attachments in parts
    if (json.messages && json.messages.length > 0) {
      const rawMessages = json.messages as UIMessage[];
      console.log(`[api/chat] Processing ${rawMessages.length} messages`);
      const lastMessage = rawMessages[rawMessages.length - 1];
      console.log(`[api/chat] Last message role: ${lastMessage.role}, parts count: ${Array.isArray(lastMessage.parts) ? lastMessage.parts.length : 'no parts'}`);
      
      if (lastMessage.role === 'user' && Array.isArray(lastMessage.parts)) {
        // Filter out null/undefined parts and only get file parts with valid URLs
        const fileParts = lastMessage.parts
          .filter((part): part is MessagePart & { url: string } => Boolean(part && (part as any).type === 'file' && typeof (part as any).url === 'string'))
          .map((part): FileAttachment => {
            const partData = part as Record<string, unknown>;
            const name =
              typeof partData.filename === 'string'
                ? partData.filename
                : typeof partData.name === 'string'
                ? partData.name
                : 'file';
            const contentType =
              typeof partData.mediaType === 'string'
                ? partData.mediaType
                : typeof partData.contentType === 'string'
                ? partData.contentType
                : 'application/octet-stream';
            const size = typeof partData.size === 'number' ? partData.size : undefined;
            return {
              url: part.url,
              name,
              contentType,
              size,
            };
          });
        
        console.log(`[api/chat] Found ${fileParts.length} file attachments`);
        if (fileParts.length > 0) {
          console.log(
            '[api/chat] File attachments:',
            fileParts.map((f: FileAttachment) => `${f.name} (${f.contentType})`)
          );
        }
        
        attachments = fileParts;
        
        // Clean up message parts to remove null/undefined entries
        const cleanParts = lastMessage.parts.filter(
          (part: MessagePart | null | undefined): part is MessagePart =>
            part !== null && part !== undefined
        );
        console.log(`[api/chat] Cleaned ${lastMessage.parts.length} parts to ${cleanParts.length} (removed ${lastMessage.parts.length - cleanParts.length})`);
        lastMessage.parts = cleanParts;
      }
    }
    
    const normaliseAttachment = (raw: unknown): FileAttachment | null => {
      if (!raw || typeof raw !== 'object') {
        return null;
      }
      const candidate = raw as Record<string, unknown>;
      const url = typeof candidate.url === 'string' ? candidate.url : undefined;
      if (!url) {
        return null;
      }
      const name =
        typeof candidate.name === 'string'
          ? candidate.name
          : typeof candidate.filename === 'string'
          ? candidate.filename
          : 'file';
      const contentType =
        typeof candidate.contentType === 'string'
          ? candidate.contentType
          : typeof candidate.mediaType === 'string'
          ? candidate.mediaType
          : 'application/octet-stream';
      const size = typeof candidate.size === 'number' ? candidate.size : undefined;
      return {
        url,
        name,
        contentType,
        size,
      };
    };

    const normaliseToggleMap = (value: unknown): AgentTools => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.entries(value as Record<string, unknown>).reduce<AgentTools>(
          (acc, [key, val]) => {
            if (val && typeof val === 'object' && 'active' in val) {
              acc[key] = {
                active: Boolean((val as Record<string, unknown>).active),
                metadata: (val as Record<string, unknown>).metadata,
              };
            }
            return acc;
          },
          {}
        );
      }
      return {};
    };

    let payloadAttachments: FileAttachment[] = [];
    if (Array.isArray(json.data.attachments)) {
      payloadAttachments = (json.data.attachments as unknown[])
        .map(normaliseAttachment)
        .filter((attachment): attachment is FileAttachment => attachment !== null);
    }

    const requestData: StreamRequestPayload = {
      messages: Array.isArray(json.messages) ? (json.messages as UIMessage[]) : [],
      id: String(json.data.id ?? ''),
      selectedChatModel: String(json.data.selectedChatModel ?? ''),
      selectedFiles: Array.isArray(json.data.selectedFiles) ? (json.data.selectedFiles as FileSearchResult[]) : [],
      systemQueue: Array.isArray(json.data.systemQueue) ? json.data.systemQueue : null,
      attachments: payloadAttachments.length > 0 ? payloadAttachments : attachments,
      agentTools: normaliseToggleMap(json.data.agentTools),
      agentFeatures: normaliseToggleMap(json.data.agentFeatures) as AgentFeatures,
      urlMapping: new Map<string, string>(),
    };
    
    // Convert S3 URLs to presigned URLs for AI model access
    // Also validate file availability to prevent 404 errors
    
    if (requestData.attachments && requestData.attachments.length > 0) {
      const validatedAttachments: FileAttachment[] = [];
      const failedFiles: string[] = [];
      
      const attachmentsToValidate: FileAttachment[] = requestData.attachments;
      for (const attachment of attachmentsToValidate) {
        let fileUrl = attachment.url;
        if (!fileUrl) continue;
        let isValid = true;
        
        // Convert S3 URLs to presigned URLs for AI model access
        if (fileUrl.startsWith('s3://')) {
          try {
            const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/files/presigned-url`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('cookie') || ''
              },
              body: JSON.stringify({ s3Url: fileUrl }),
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.presignedUrl) {
                fileUrl = data.presignedUrl;
              } else {
                isValid = false;
                failedFiles.push(attachment.name || 'Unknown file');
                console.warn(`Failed to get presigned URL for: ${attachment.name}`);
              }
            } else {
              isValid = false;
              failedFiles.push(attachment.name || 'Unknown file');
              console.warn(`S3 file not found (${response.status}): ${attachment.name}`);
            }
          } catch (error) {
            isValid = false;
            failedFiles.push(attachment.name || 'Unknown file');
            console.error(`Error processing S3 file: ${attachment.name}`, error);
          }
        }
        
        if (isValid) {
          validatedAttachments.push({
            ...attachment,
            url: fileUrl,
            originalS3Url: attachment.url.startsWith('s3://') ? attachment.url : undefined
          });
        }
      }
      
      // If some files failed, return error to user
      if (failedFiles.length > 0) {
        return new Response(JSON.stringify({
          error: `The following files could not be accessed: ${failedFiles.join(', ')}. Please verify these files exist and try again.`,
          code: 'FILE_ACCESS_ERROR',
          failedFiles
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      requestData.attachments = validatedAttachments;
      
      // Create mapping of original S3 URLs to presigned URLs for message part updates
      const urlMapping = new Map<string, string>();
      requestData.attachments.forEach((attachment: FileAttachment) => {
        if (attachment.originalS3Url && attachment.url !== attachment.originalS3Url) {
          urlMapping.set(attachment.originalS3Url, attachment.url);
        }
      });
      
      // Pass URL mapping to streamAgent for message part updates
      if (urlMapping.size > 0) {
        requestData.urlMapping = urlMapping;
      }
    }
    
    // Process the request directly here instead of calling route.service
    const { messages, id, selectedChatModel, selectedFiles, urlMapping, agentTools, agentFeatures } = requestData;

    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response('Messages must be an array with at least one entry', { status: 400 });
    }

    const userMessage = messages[messages.length - 1];
    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const modelId = selectedChatModel;
    if (!modelId) {
      return new Response('Model not specified', { status: 400 });
    }
    const model = myProvider.languageModel(modelId);

    const chat = await getChatById({ id });
    if (!chat) {
      const { title } = await generateTitleFromUserMessage({ message: userMessage });
      await saveChat({ id, userId: session.user.id, title });
    }

    // Get conversation history from database for context
    const { getChatContext } = await import('@/lib/ai/chat-manager');
    const chatContext = await getChatContext(id, session.user.id);
    await chatContext.initialize(session.user.id);
    const contextMessages = await chatContext.getMessages();

    const allMessages = [...contextMessages, userMessage];

    const cleanedMessages = cleanupOrphanedToolCalls(allMessages);
    let finalMessages = cleanupEmptyMessages(cleanedMessages) as UIMessage[];
    
    // Log messages before processing
    console.log(`[api/chat] Processing ${finalMessages.length} messages`);
    for (const msg of finalMessages) {
      if (msg.parts && Array.isArray(msg.parts)) {
        const fileParts = msg.parts.filter(p => p.type === 'file');
        if (fileParts.length > 0) {
          console.log(`[api/chat] Message has ${fileParts.length} file parts:`, fileParts.map(p => ({ filename: p.filename, mediaType: p.mediaType })));
        }
      }
    }

    const processedMessages = await Promise.all(
      finalMessages.map(async (message: UIMessage) => {
        if (!message.parts || !Array.isArray(message.parts)) {
          return message;
        }

        const processedParts = await Promise.all(
          message.parts.map(async (part: MessagePart) => {
            // Handle file parts
            if (part.type === 'file' && part.url) {
              const filename = part.filename || 'unknown';
              const mediaType = part.mediaType || 'application/octet-stream';
              
              // For images, keep them as file parts for proper AI SDK handling
              if (mediaType.startsWith('image/')) {
                // Ensure mediaType is set correctly for images
                const ext = filename.split('.').pop()?.toLowerCase() ?? '';
                const imageMediaTypeMap: Record<string, string> = {
                  'png': 'image/png',
                  'jpg': 'image/jpeg',
                  'jpeg': 'image/jpeg',
                  'gif': 'image/gif',
                  'webp': 'image/webp',
                };
                const correctMediaType = imageMediaTypeMap[ext] ?? mediaType;
                
                // Convert S3 URLs to presigned URLs for images
                let finalUrl = part.url;
                if (part.url.startsWith('s3://')) {
                  try {
                    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/files/presigned-url`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Cookie': request?.headers.get('cookie') || ''
                      },
                      body: JSON.stringify({ s3Url: part.url }),
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      if (data.presignedUrl) {
                        finalUrl = data.presignedUrl;
                      }
                    }
                  } catch (error) {
                    console.error(`Error converting S3 URL for image: ${part.url}`, error);
                  }
                }
                
                return {
                  ...part,
                  url: finalUrl,
                  mediaType: correctMediaType
                };
              }
              
              // For documents (PDF, text, etc.), keep as file parts too
              // Claude SDK v5 now supports native file handling for these types
              const supportedDocumentTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/json'];
              const isSupportedDocument = supportedDocumentTypes.some(type => mediaType === type || mediaType.startsWith(`${type.split('/')[0]}/`));
              
              if (isSupportedDocument) {
                // Ensure mediaType is correctly set for documents
              const documentMediaTypeMap: Record<string, string> = {
                'pdf': 'application/pdf',
                'txt': 'text/plain',
                'md': 'text/markdown',
                'markdown': 'text/markdown',
                'json': 'application/json',
              };
              const correctedMediaType =
                documentMediaTypeMap[filename.split('.').pop()?.toLowerCase() ?? ''] ?? mediaType;
                
                console.log(`[api/chat] Passing document as file part: ${filename} (${correctedMediaType})`);
                
                return {
                  ...part,
                  mediaType: correctedMediaType,
                  url: part.url
                };
              }
              
              // For unsupported file types, skip them
              console.warn(`Skipping unsupported file type: ${filename} (${mediaType})`);
              return null;
            }
            
            // Return non-file parts as-is
            return part;
          })
        );

        // Filter out null parts (failed file processing)
        const validParts = processedParts.filter(
          (part): part is MessagePart => part !== null
        );
        
        return {
          ...message,
          parts: validParts
        };
      })
    );
    
    finalMessages = processedMessages;
    
    // Log file processing summary
    let imageCount = 0;
    let documentCount = 0;
    let filePartsCount = 0;
    
    for (const message of finalMessages) {
      if (message.parts && Array.isArray(message.parts)) {
        for (const part of message.parts) {
          if (part.type === 'file' && part.mediaType?.startsWith('image/')) {
            imageCount++;
            filePartsCount++;
          } else if (part.type === 'file' && (part.mediaType === 'application/pdf' || part.mediaType?.startsWith('text/'))) {
            documentCount++;
            filePartsCount++;
            console.log(`[api/chat] Passing file part to Claude: ${part.filename} (${part.mediaType})`);
          }
        }
      }
    }
    
    console.log(`[api/chat] Final processing summary: ${imageCount} images, ${documentCount} documents, ${filePartsCount} total file parts`);
    
    
    // Override metadata to ensure S3 files are treated as attachments
    if (selectedFiles?.length > 0) {
      selectedFiles.forEach((file: FileSearchResult) => {
        const isS3 = file.url?.startsWith('s3://');
        if (isS3 && !file.metadata?.isAttachment) {
          if (!file.metadata) {
            file.metadata = {};
          }
          file.metadata.isAttachment = true;
        }
      });
    }

    const userLocale = await getUserLocale();

    return streamStandardAgent({
      session,
      model,
      userMessage,
      messages: finalMessages, // Include current user message in conversation
      chatId: id,
      selectedChatModel: modelId,
      agentTools,
      agentFeatures,
      userLocale,
      systemQueue: requestData.systemQueue,
    });
  } catch (error: any) {
    console.error('Chat route error:', error);
    
    // Handle specific error types
    if (error?.message?.includes('Document size limit exceeded') || 
        error?.message?.includes('Too many files')) {
      return new Response(JSON.stringify({
        error: error.message,
        code: 'FILE_SIZE_ERROR'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (error?.message?.includes('could not be accessed')) {
      return new Response(JSON.stringify({
        error: error.message,
        code: 'FILE_ACCESS_ERROR'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'An error occurred while processing your request!',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });
    if (!chat || chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });
    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
