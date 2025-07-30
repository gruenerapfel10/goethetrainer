'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useCallback } from 'react';
import { artifactDefinitions, type ArtifactKind } from './artifact';
import type { Suggestion } from '@/lib/db/schema';
import { initialArtifactData, useArtifact } from '@/hooks/use-artifact';
import { toast } from './toast';

export type DataStreamDelta = {
  type:
    | 'text-delta'
    | 'code-delta'
    | 'sheet-delta'
    | 'image-delta'
    | 'title'
    | 'id'
    | 'suggestion'
    | 'clear'
    | 'finish'
    | 'kind'
    | 'error'
    | 'status'
    | 'fileName';
  content: string | Suggestion;
};

export function DataStreamHandler({ id }: { id: string }) {
  const { data: dataStream } = useChat({ id });

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);
  const finishTimeoutRef = useRef<NodeJS.Timeout>();

  // Enhanced delta processing with better error handling
  const processStreamDelta = useCallback((delta: DataStreamDelta) => {
    const artifactDefinition = artifactDefinitions.find(
      (artifactDefinition) => artifactDefinition.kind === artifact.kind,
    );

    if (artifactDefinition?.onStreamPart) {
      try {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      } catch (error) {
        console.error('Artifact stream processing error:', error);
      }
    }

    setArtifact((draftArtifact) => {
      if (!draftArtifact) {
        return { ...initialArtifactData, status: 'streaming' };
      }

      switch (delta.type) {
        case 'id':
          return {
            ...draftArtifact,
            documentId: delta.content as string,
            status: 'streaming',
          };

        case 'title':
          return {
            ...draftArtifact,
            title: delta.content as string,
            status: 'streaming',
          };

        case 'kind':
          return {
            ...draftArtifact,
            kind: delta.content as ArtifactKind,
            status: 'streaming',
          };

        case 'clear':
          return {
            ...draftArtifact,
            content: '',
            status: 'streaming',
          };

        case 'status': {
          // Handle status updates without changing artifact state
          const statusContent = delta.content as string;
          console.log('Stream status:', statusContent);
          
          // Update status but maintain streaming state until explicit finish
          return {
            ...draftArtifact,
            status: statusContent === 'completed' ? 'idle' : 'streaming',
          };
        }

        case 'finish':
          // Clear any existing finish timeout
          if (finishTimeoutRef.current) {
            clearTimeout(finishTimeoutRef.current);
          }
          
          // Set a delayed finish to allow UI components to react
          finishTimeoutRef.current = setTimeout(() => {
            setArtifact((draft) => draft ? { ...draft, status: 'idle' } : draft);
          }, 500);
          
          return {
            ...draftArtifact,
            status: 'streaming'
          };

        case 'error':
          // Clear any finish timeout on error
          if (finishTimeoutRef.current) {
            clearTimeout(finishTimeoutRef.current);
          }
          
          // Show toast notification for file processing errors
          toast({
            type: 'error',
            description: `Processing error: ${delta.content}`,
          });
          
          return {
            ...draftArtifact,
            status: 'idle',
          };



        default:
          return draftArtifact;
      }
    });
  }, [artifact.kind, setArtifact, setMetadata]);

  useEffect(() => {
    if (!dataStream?.length) return;

    // Process only new deltas to avoid reprocessing
    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    
    if (newDeltas.length === 0) return;
    
    lastProcessedIndex.current = dataStream.length - 1;

    // Process each delta with error boundary
    (newDeltas as DataStreamDelta[]).forEach((delta: DataStreamDelta) => {
      try {
        processStreamDelta(delta);
      } catch (error) {
        console.error('Delta processing error:', error, delta);
        // Continue processing other deltas even if one fails
      }
    });
  }, [dataStream, processStreamDelta]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
    };
  }, []);

  return null;
}