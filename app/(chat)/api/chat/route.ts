import { auth } from '@/app/(auth)/auth';
import { streamStandardAgent } from './standard-agent';
import { deleteChatById, getChatById, saveChat } from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '@/app/(chat)/actions';
import { myProvider } from '@/lib/ai/models';
import { cleanupOrphanedToolCalls, cleanupEmptyMessages } from '@/lib/utils/message-filter';
import { getFirebaseFileContent } from '@/lib/utils/firebase-content';
import type { FileSearchResult } from '@/components/chat-header';
import { getUserLocale } from '@/services/locale';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    console.log('[api/chat] Received chat request');
    
    if (!json.data) {
      console.error('[api/chat] Invalid request format - no data');
      return new Response('Invalid request format', { status: 400 });
    }
    
    let attachments: any[] = [];
    
    // Check if messages have attachments in parts
    if (json.messages && json.messages.length > 0) {
      console.log(`[api/chat] Processing ${json.messages.length} messages`);
      const lastMessage = json.messages[json.messages.length - 1];
      console.log(`[api/chat] Last message role: ${lastMessage.role}, parts count: ${Array.isArray(lastMessage.parts) ? lastMessage.parts.length : 'no parts'}`);
      
      if (lastMessage.role === 'user' && Array.isArray(lastMessage.parts)) {
        // Filter out null/undefined parts and only get file parts with valid URLs
        const fileParts = lastMessage.parts
          .filter((part: any) => part && part.type === 'file' && part.url)
          .map((part: any) => ({
            url: part.url,
            name: part.filename || part.name || 'file',
            contentType: part.mediaType || part.contentType || 'application/octet-stream',
            size: part.size
          }));
        
        console.log(`[api/chat] Found ${fileParts.length} file attachments`);
        if (fileParts.length > 0) {
          console.log('[api/chat] File attachments:', fileParts.map(f => `${f.name} (${f.contentType})`));
        }
        
        attachments = fileParts;
        
        // Clean up message parts to remove null/undefined entries
        const cleanParts = lastMessage.parts.filter((part: any) => part !== null && part !== undefined);
        console.log(`[api/chat] Cleaned ${lastMessage.parts.length} parts to ${cleanParts.length} (removed ${lastMessage.parts.length - cleanParts.length})`);
        lastMessage.parts = cleanParts;
      }
    }
    
    const requestData = {
      messages: json.messages,
      id: json.data.id,
      selectedChatModel: json.data.selectedChatModel,
      selectedFiles: json.data.selectedFiles,
      systemQueue: json.data.systemQueue,
      attachments: json.data.attachments || attachments,
      agentTools: json.data.agentTools,
      agentFeatures: json.data.agentFeatures,
      urlMapping: new Map(),
    };
    
    // Convert S3 URLs to presigned URLs for AI model access
    // Also validate file availability to prevent 404 errors
    
    if (requestData.attachments && requestData.attachments.length > 0) {
      const validatedAttachments: any[] = [];
      const failedFiles: string[] = [];
      
      for (const attachment of requestData.attachments) {
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
      const urlMapping = new Map();
      requestData.attachments.forEach((attachment: any, index: number) => {
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

    if (!Array.isArray(messages)) {
      return new Response('Messages must be an array', { status: 400 });
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
    let finalMessages = cleanupEmptyMessages(cleanedMessages);

    const processedMessages = await Promise.all(
      finalMessages.map(async (message) => {
        if (!message.parts || !Array.isArray(message.parts)) {
          return message;
        }

        const processedParts = await Promise.all(
          message.parts.map(async (part) => {
            // Handle file parts
            if (part.type === 'file' && part.url) {
              const filename = part.filename || 'unknown';
              const isImage = part.mediaType?.startsWith('image/') || 
                           filename.match(/\.(png|jpg|jpeg|gif|webp)$/i);
              
              // For images, keep them as file parts for proper AI SDK handling
              if (isImage) {
                // Ensure mediaType is set correctly for images
                if (!part.mediaType) {
                  const ext = filename.split('.').pop()?.toLowerCase();
                  switch (ext) {
                    case 'png': part.mediaType = 'image/png'; break;
                    case 'jpg':
                    case 'jpeg': part.mediaType = 'image/jpeg'; break;
                    case 'gif': part.mediaType = 'image/gif'; break;
                    case 'webp': part.mediaType = 'image/webp'; break;
                    default: part.mediaType = 'image/jpeg';
                  }
                }
                
                // Convert S3 URLs to presigned URLs for images
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
                        part.url = data.presignedUrl;
                      }
                    }
                  } catch (error) {
                    console.error(`Error converting S3 URL for image: ${part.url}`, error);
                  }
                }
                
                // Return image as file part for proper SDK handling
                return part;
              }
              
              // For non-image files (documents), embed content as text
              try {
                let fileContent = '';
                
                if (part.url.startsWith('http')) {
                  // For HTTP/HTTPS URLs (including Firebase signed URLs)
                  console.log(`[api/chat] Fetching document from URL: ${part.url.substring(0, 50)}...`);
                  try {
                    const response = await fetch(part.url);
                    if (response.ok) {
                      // Check content type to determine how to read
                      const contentType = response.headers.get('content-type');
                      if (contentType?.includes('text') || contentType?.includes('json')) {
                        fileContent = await response.text();
                        console.log(`[api/chat] Successfully fetched text document: ${fileContent.length} chars`);
                      } else if (contentType?.includes('pdf')) {
                        // For PDFs, just note it was processed
                        fileContent = `[PDF File] - Processed binary content`;
                        console.log(`[api/chat] Processed PDF file`);
                      } else {
                        console.warn(`Cannot process binary file as text: ${part.url}`);
                        return null; // Skip binary files that aren't images
                      }
                    } else {
                      console.warn(`Could not fetch content from URL: ${part.url}`);
                      return null;
                    }
                  } catch (fetchError) {
                    console.warn(`Error fetching file content from URL: ${part.url}`, fetchError);
                    return null;
                  }
                }
                
                if (fileContent) {
                  // Convert document content to text part
                  return {
                    type: 'text' as const,
                    text: `[File: ${filename}]\n\n${fileContent}\n\n[End of file: ${filename}]`
                  };
                }
              } catch (error) {
                console.error(`Error processing document ${part.filename || part.url}:`, error);
                return null;
              }
            }
            
            // Return non-file parts as-is
            return part;
          })
        );

        // Filter out null parts (failed file processing)
        const validParts = processedParts.filter(part => part !== null);
        
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
    
    for (const message of finalMessages) {
      if (message.parts && Array.isArray(message.parts)) {
        for (const part of message.parts) {
          if (part.type === 'file' && part.mediaType?.startsWith('image/')) {
            imageCount++;
          } else if (part.type === 'text' && part.text && part.text.startsWith('[File:')) {
            documentCount++;
          }
        }
      }
    }
    
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
