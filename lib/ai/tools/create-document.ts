import { generateUUID } from '@/lib/utils';
import { streamText, type UIMessage, tool } from 'ai';
import { smoothStream } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import { myProvider } from '../models';
import { getArtifactManager } from '@/lib/artifacts/artifact-manager';
import { ArtifactKind } from '@/lib/artifacts/artifact-registry';

const artifactKinds = Object.values(ArtifactKind) as [ArtifactKind, ...ArtifactKind[]];

// Export the create document tool using native V5 generator pattern
export const createDocument = (session: Session | null, chatId: string) => {
  return tool({
    description: 'Create a document for writing, content creation, or image generation/editing. This tool will call other functions that will generate the contents of the document based on the title and kind. For image generation or editing, use kind="image".',
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async function* ({ title, kind }, { toolCallId, messages }: any = {}) {
      const id = generateUUID();
      
      // Extract file attachments from message parts (AI SDK v5)
      const userMessage = messages?.[messages.length - 1];
      const imageAttachments = userMessage?.parts
        ?.filter((part: any) => part.type === 'file' && part.mediaType?.startsWith('image/'))
        ?.map((part: any) => ({
          url: part.url,
          filename: part.filename,
          mediaType: part.mediaType,
        })) || [];
      
      // Yield initial status update
      yield {
        id: `create-${id}-start`,
        type: 'status',
        status: 'running',
        title: 'Creating Document',
        message: `Starting to create "${title}"`,
        timestamp: Date.now(),
        data: {
          documentId: id,
          title,
          kind,
          phase: 'started'
        }
      };
      
      // Yield document metadata so UI can open the artifact
      yield {
        id: `create-${id}-open`,
        type: 'metadata',
        status: 'running',
        title: 'Document Ready',
        message: 'Opening document editor...',
        timestamp: Date.now(),
        data: {
          documentId: id,
          title,
          kind,
          phase: 'document-open',
          content: '' // Start with empty content
        }
      };
    
    try {
      // Stream the content generation for all document types
      let draftContent = '';
      let chunkCount = 0;
      
      // Determine the system prompt based on document type
      let systemPrompt = '';
      switch (kind) {
        case ArtifactKind.CODE:
          systemPrompt = 'Write code based on the given requirements. Use proper syntax highlighting and comments where appropriate.';
          break;
        case ArtifactKind.SHEET:
          systemPrompt = 'Create a spreadsheet with the requested data. Use CSV format with headers.';
          break;
        case ArtifactKind.WEBPAGE:
          systemPrompt = 'Create a complete webpage with HTML, CSS, and JavaScript as needed.';
          break;
        default:
          systemPrompt = 'Write about the given topic. Markdown is supported. Use headings wherever appropriate.';
      }
      
      const { fullStream } = streamText({
        model: myProvider.languageModel('artifact-model'),
        system: systemPrompt,
        experimental_transform: smoothStream({ chunking: 'word' }),
        prompt: title,
      });
      
      for await (const delta of fullStream) {
        const { type } = delta;
        
        if (type === 'text-delta') {
          const { text } = delta;
          draftContent += text;
          chunkCount++;
          
          // Yield content update for real-time display
          yield {
            id: `create-${id}-content`,
            type: 'metadata',
            status: 'running',
            title: 'Generating Content',
            message: `Writing content...`,
            timestamp: Date.now(),
            overwrite: true,
            data: {
              documentId: id,
              title,
              kind,
              phase: 'content-streaming',
              content: draftContent,
              isPartial: true
            }
          };
        }
      }
      
      // Save the document using artifact manager
      const artifactManager = await getArtifactManager(session?.user?.id || 'default', chatId);
      artifactManager.create({
        documentId: id,
        kind,
        title,
        content: draftContent,
      });
      await artifactManager.saveVersion(id, draftContent, title, 'ai');
      
      // Reload to get the saved document with all fields
      const savedArtifact = await artifactManager.load(id);
      
      // Yield final complete status with full document details
      yield {
        id: `create-${id}-complete`,
        type: 'status',
        status: 'completed',
        title: 'Document Created',
        message: `Successfully created "${title}"`,
        timestamp: Date.now(),
        overwrite: true,
        data: {
          documentId: id,
          title: savedArtifact.title,
          kind: savedArtifact.kind,
          phase: 'completed',
          content: savedArtifact.content,
          version: savedArtifact.currentVersion,
          author: 'ai',
          isWorkingVersion: true,
          isPartial: false
        }
      };
      
      return {
        id,
        title: savedArtifact.title,
        kind: savedArtifact.kind,
        content: savedArtifact.content,
        version: savedArtifact.currentVersion,
        author: 'ai',
        isWorkingVersion: true,
        workingVersion: savedArtifact.workingVersion
      };
      } catch (error) {
        yield {
          id: `create-${id}-error`,
          type: 'error',
          status: 'failed',
          title: 'Creation Failed',
          message: error instanceof Error ? error.message : 'Failed to create document',
          timestamp: Date.now(),
          data: {
            documentId: id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        
        throw error;
      }
    }
  });
};