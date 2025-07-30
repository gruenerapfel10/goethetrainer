'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useArtifact } from '@/hooks/use-artifact';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useArtifactPanel } from './artifact-provider';
import type { UIMessage } from 'ai';
import type { Document, Vote } from '@/lib/db/schema';
import { formatDistance } from 'date-fns';
import useSWR, { useSWRConfig } from 'swr';
import { useDebounceCallback, useWindowSize } from 'usehooks-ts';
import { fetcher } from '@/lib/utils';
import { ArtifactActions } from './artifact-actions';
import { ArtifactCloseButton } from './artifact-close-button';
import { Toolbar } from './toolbar';
import { VersionFooter } from './version-footer';
import { artifactDefinitions } from './artifact';
import type { UseChatHelpers } from '@ai-sdk/react';

interface ArtifactPanelProps {
  selectedModelId: string;
  chatId: string;
  status: UseChatHelpers['status'];
  stop: UseChatHelpers['stop'];
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  votes: Array<Vote> | undefined;
  append: UseChatHelpers['append'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
}

export function ArtifactPanel({
  selectedModelId,
  chatId,
  status,
  stop,
  messages,
  setMessages,
  votes,
  append,
  reload,
  isReadonly,
}: ArtifactPanelProps) {
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();
  const { width: panelWidth, setWidth: setPanelWidth } = useArtifactPanel();
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: windowWidth } = useWindowSize();

  const {
    data: documents,
    isLoading: isDocumentsFetching,
    mutate: mutateDocuments,
  } = useSWR<Array<Document>>(
    artifact.documentId !== 'init' && artifact.status !== 'streaming'
      ? `/api/document?id=${artifact.documentId}`
      : null,
    fetcher,
  );

  const [mode, setMode] = useState<'edit' | 'diff'>('edit');
  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocument = documents.at(-1);
      if (mostRecentDocument) {
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(documents.length - 1);
        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          content: mostRecentDocument.content ?? '',
        }));
      }
    }
  }, [documents, setArtifact]);

  useEffect(() => {
    mutateDocuments();
  }, [artifact.status, mutateDocuments]);

  const { mutate } = useSWRConfig();
  const [isContentDirty, setIsContentDirty] = useState(false);

  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!artifact) return;

      mutate<Array<Document>>(
        `/api/document?id=${artifact.documentId}`,
        async (currentDocuments) => {
          if (!currentDocuments) return undefined;

          const currentDocument = currentDocuments.at(-1);

          if (!currentDocument || !currentDocument.content) {
            setIsContentDirty(false);
            return currentDocuments;
          }

          if (currentDocument.content !== updatedContent) {
            await fetch(`/api/document?id=${artifact.documentId}`, {
              method: 'POST',
              body: JSON.stringify({
                title: artifact.title,
                content: updatedContent,
                kind: artifact.kind,
              }),
            });

            setIsContentDirty(false);

            const newDocument = {
              ...currentDocument,
              content: updatedContent,
              createdAt: new Date(),
            };

            return [...currentDocuments, newDocument];
          }
          return currentDocuments;
        },
        { revalidate: false },
      );
    },
    [artifact, mutate],
  );

  const debouncedHandleContentChange = useDebounceCallback(
    handleContentChange,
    2000,
  );

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      setIsContentDirty(true);

      if (debounce) {
        debouncedHandleContentChange(updatedContent);
      } else {
        handleContentChange(updatedContent);
      }
    },
    [debouncedHandleContentChange, handleContentChange],
  );

  function getDocumentContentById(index: number) {
    if (!documents) return '';
    if (!documents[index]) return '';
    return documents[index].content ?? '';
  }

  const handleVersionChange = (type: 'next' | 'prev' | 'toggle' | 'latest') => {
    if (!documents) return;

    if (type === 'latest') {
      setCurrentVersionIndex(documents.length - 1);
      setMode('edit');
    }

    if (type === 'toggle') {
      setMode((mode) => (mode === 'edit' ? 'diff' : 'edit'));
    }

    if (type === 'prev') {
      if (currentVersionIndex > 0) {
        setCurrentVersionIndex((index) => index - 1);
      }
    } else if (type === 'next') {
      if (currentVersionIndex < documents.length - 1) {
        setCurrentVersionIndex((index) => index + 1);
      }
    }
  };

  const isCurrentVersion =
    documents && documents.length > 0
      ? currentVersionIndex === documents.length - 1
      : true;

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind,
  );

  if (!artifactDefinition) {
    throw new Error('Artifact definition not found!');
  }

  useEffect(() => {
    if (artifact.documentId !== 'init') {
      if (artifactDefinition.initialize) {
        artifactDefinition.initialize({
          documentId: artifact.documentId,
          setMetadata,
        });
      }
    }
  }, [artifact.documentId, artifactDefinition, setMetadata]);

  // Resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !windowWidth) return;
      
      const newWidth = ((windowWidth - e.clientX) / windowWidth) * 100;
      const clampedWidth = Math.max(20, Math.min(80, newWidth));
      setPanelWidth(clampedWidth);
    },
    [isDragging, windowWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    
    // Ensure we're in the browser
    if (typeof window === 'undefined' || !window.document) return;
    
    const handleMouseMoveWrapper = (e: MouseEvent) => handleMouseMove(e);
    const handleMouseUpWrapper = () => handleMouseUp();
    
    try {
      window.document.addEventListener('mousemove', handleMouseMoveWrapper);
      window.document.addEventListener('mouseup', handleMouseUpWrapper);
      
      if (window.document.body) {
        window.document.body.style.cursor = 'col-resize';
        window.document.body.style.userSelect = 'none';
      }
    } catch (error) {
      console.error('Error adding event listeners:', error);
      return;
    }

    return () => {
      try {
        window.document.removeEventListener('mousemove', handleMouseMoveWrapper);
        window.document.removeEventListener('mouseup', handleMouseUpWrapper);
        
        if (window.document.body) {
          window.document.body.style.cursor = '';
          window.document.body.style.userSelect = '';
        }
      } catch (error) {
        console.error('Error removing event listeners:', error);
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!artifact.isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
          ref={containerRef}
          className="fixed right-0 top-0 h-dvh z-40 flex border-l dark:border-zinc-700 border-zinc-200 bg-background"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          style={{ width: `${panelWidth}%` }}
        >
          {/* Resize Handle */}
          <div className="relative w-0 h-full">
            {/* Border line */}
            <div className="absolute left-0 top-0 w-px h-full bg-border" />
            
            {/* Invisible drag area */}
            <div 
              className="absolute left-[-4px] top-0 w-2 h-full cursor-col-resize z-50"
              onMouseDown={handleMouseDown}
            />
            
            {/* Apple-style pill handle */}
            <div
              className={cn(
                "absolute left-[-16px] top-1/2 -translate-y-1/2 z-50",
                "w-4 h-16 flex items-center justify-center",
                "cursor-col-resize",
                "transition-opacity duration-200",
                isDragging ? "opacity-100" : "opacity-60 hover:opacity-100",
                "group"
              )}
              onMouseDown={handleMouseDown}
            >
              <div
                className={cn(
                  "w-1.5 h-12 rounded-full",
                  "bg-zinc-400 dark:bg-zinc-600",
                  "transition-all duration-200 ease-out",
                  "group-hover:h-16 group-hover:w-2 group-hover:bg-zinc-500 dark:group-hover:bg-zinc-500",
                  isDragging && "h-16 w-2 bg-zinc-500 dark:bg-zinc-500",
                  "shadow-sm"
                )}
              />
            </div>
          </div>

          {/* Artifact Content */}
          <div className="flex-1 dark:bg-muted bg-background h-full flex flex-col overflow-y-scroll">
            <AnimatePresence>
              {!isCurrentVersion && (
                <motion.div
                  className="absolute inset-0 bg-zinc-900/50 z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>

            <div className="p-2 flex flex-row justify-between items-start">
              <div className="flex flex-row gap-4 items-start">
                <ArtifactCloseButton />

                <div className="flex flex-col">
                  <div className="font-medium">{artifact.title}</div>

                  {isContentDirty ? (
                    <div className="text-sm text-muted-foreground">
                      Saving changes...
                    </div>
                  ) : document ? (
                    <div className="text-sm text-muted-foreground">
                      {`Updated ${formatDistance(
                        new Date(document.createdAt),
                        new Date(),
                        {
                          addSuffix: true,
                        },
                      )}`}
                    </div>
                  ) : (
                    <div className="w-32 h-3 mt-2 bg-muted-foreground/20 rounded-md animate-pulse" />
                  )}
                </div>
              </div>

              <ArtifactActions
                artifact={artifact}
                currentVersionIndex={currentVersionIndex}
                handleVersionChange={handleVersionChange}
                isCurrentVersion={isCurrentVersion}
                mode={mode}
                metadata={metadata}
                setMetadata={setMetadata}
              />
            </div>

            <div className="dark:bg-muted bg-background h-full overflow-y-scroll !max-w-full items-center">
              <artifactDefinition.content
                title={artifact.title}
                content={
                  isCurrentVersion
                    ? artifact.content
                    : getDocumentContentById(currentVersionIndex)
                }
                mode={mode}
                status={artifact.status}
                currentVersionIndex={currentVersionIndex}
                suggestions={[]}
                onSaveContent={saveContent}
                isInline={false}
                isCurrentVersion={isCurrentVersion}
                getDocumentContentById={getDocumentContentById}
                isLoading={isDocumentsFetching && !artifact.content}
                metadata={metadata}
                setMetadata={setMetadata}
              />

              <AnimatePresence>
                {isCurrentVersion && (
                  <Toolbar
                    isToolbarVisible={isToolbarVisible}
                    setIsToolbarVisible={setIsToolbarVisible}
                    append={append}
                    status={status}
                    stop={stop}
                    setMessages={setMessages}
                    artifactKind={artifact.kind}
                  />
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {!isCurrentVersion && (
                <VersionFooter
                  currentVersionIndex={currentVersionIndex}
                  documents={documents}
                  handleVersionChange={handleVersionChange}
                />
              )}
            </AnimatePresence>
          </div>
      </motion.div>
    </AnimatePresence>
  );
}