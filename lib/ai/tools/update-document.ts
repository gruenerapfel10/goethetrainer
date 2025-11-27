import { streamText, tool } from 'ai';
import { smoothStream } from 'ai';
import { z } from 'zod';
import { getArtifactManager } from '@/lib/artifacts/artifact-manager';
import type { ArtifactKind } from '@/lib/artifacts/artifact-registry';
import { myProvider } from '../models';
import { updateDocumentPrompt } from '@/lib/ai/prompts';

// Standard streaming update format
interface StreamUpdate {
  id: string;
  type: 'progress' | 'status' | 'result' | 'error' | 'metadata';
  status: 'pending' | 'running' | 'completed' | 'failed';
  title?: string;
  message?: string;
  data?: any;
  timestamp: number;
  overwrite?: boolean;
}

// Export the update document tool using native V5 generator pattern
export const updateDocument = (session: { user: { id: string } } | null, chatId: string) => {
  return tool({
    description: 'Update a document with the given description.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
    }),
    execute: async function* ({ id, description }, { toolCallId }: any = {}) {
      
      // Yield initial status update
      yield {
        id: `update-${id}-start`,
        type: 'status',
        status: 'running',
        title: 'Updating Document',
        message: `Loading document for update...`,
        timestamp: Date.now(),
        data: {
          documentId: id,
          description,
          phase: 'started'
        }
      };
    
    // Fetch the document using artifact manager
    const artifactManager = await getArtifactManager(session?.user?.id || 'default', chatId);
    const artifact = await artifactManager.load(id);
    
    if (!artifact) {
      yield {
        id: `update-${id}-error`,
        type: 'error',
        status: 'failed',
        title: 'Document Not Found',
        message: `Document with ID ${id} not found`,
        timestamp: Date.now(),
        data: {
          documentId: id,
          error: 'Document not found'
        }
      };
      
      return {
        error: 'Document not found',
      };
    }
    
    const document = {
      id: artifact.documentId,
      title: artifact.title,
      content: artifact.content,
      kind: artifact.kind,
    };
    
      
      // Yield document info so UI can open the artifact
      yield {
        id: `update-${id}-open`,
        type: 'metadata',
        status: 'running',
        title: 'Document Ready',
        message: 'Opening document editor...',
        timestamp: Date.now(),
        data: {
          documentId: id,
          title: document.title,
          kind: document.kind,
          phase: 'document-open',
          content: document.content // Start with existing content
        }
      };
    
    try {
      // Stream the content generation
      let draftContent = '';
      let chunkCount = 0;
      
      // Determine the system prompt based on document type
      const systemPrompt = updateDocumentPrompt(document.content, document.kind as ArtifactKind);
      
      const { fullStream } = streamText({
        model: myProvider.languageModel('artifact-model'),
        system: systemPrompt,
        experimental_transform: smoothStream({ chunking: 'word' }),
        prompt: description,
      });
      
      yield {
        id: `update-${id}-generating`,
        type: 'status',
        status: 'running',
        title: 'Generating Updates',
        message: 'Starting to apply changes...',
        timestamp: Date.now(),
        data: {
          documentId: id,
          phase: 'generating'
        }
      };
      
      for await (const delta of fullStream) {
        const { type } = delta;
        
        if (type === 'text-delta') {
          const { text } = delta;
          draftContent += text;
          chunkCount++;
          
          // Yield content updates periodically
          if (chunkCount % 5 === 0) {
            yield {
              id: `update-${id}-content`,
              type: 'metadata',
              status: 'running',
              title: 'Updating Content',
              message: `Applying changes...`,
              timestamp: Date.now(),
              overwrite: true,
              data: {
                documentId: id,
                title: document.title,
                kind: document.kind,
                phase: 'content-streaming',
                content: draftContent,
                isPartial: true
              }
            };
          }
        }
      }
      
      // Save the updated document using artifact manager
      await artifactManager.saveVersion(id, draftContent, document.title, 'ai');
      
      // Reload to get the updated document with all fields
      const updatedArtifact = await artifactManager.load(id);
      
      // Yield final complete status with full document details
      yield {
        id: `update-${id}-complete`,
        type: 'status',
        status: 'completed',
        title: 'Document Updated',
        message: `Successfully updated "${document.title}"`,
        timestamp: Date.now(),
        overwrite: true,
        data: {
          documentId: id,
          title: updatedArtifact.title,
          kind: updatedArtifact.kind,
          phase: 'completed',
          content: updatedArtifact.content,
          version: updatedArtifact.currentVersion,
          author: 'ai',
          isWorkingVersion: updatedArtifact.currentVersion === updatedArtifact.workingVersion,
          isPartial: false
        }
      };
      
      return {
        id,
        title: updatedArtifact.title,
        kind: updatedArtifact.kind,
        content: updatedArtifact.content,
        version: updatedArtifact.currentVersion,
        author: 'ai',
        isWorkingVersion: updatedArtifact.currentVersion === updatedArtifact.workingVersion,
        workingVersion: updatedArtifact.workingVersion
      };
      } catch (error) {
        yield {
          id: `update-${id}-error`,
          type: 'error',
          status: 'failed',
          title: 'Update Failed',
          message: error instanceof Error ? error.message : 'Failed to update document',
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
