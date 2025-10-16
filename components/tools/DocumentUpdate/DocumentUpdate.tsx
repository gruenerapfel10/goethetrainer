'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { memo, useState, useEffect, useMemo } from 'react';
import { PenTool, Loader2, AlertCircle, ExternalLink, RefreshCw, FileText, Code, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useArtifactsContext } from '@/contexts/artifacts-context';
import { toast } from 'sonner';
import { Response } from '@/components/ai-elements/response';

interface DocumentUpdateProps {
  toolCallId: string;
  state: 'input-available' | 'output-available' | 'output-error';
  input?: {
    id: string;
    description: string;
  };
  output?: {
    id: string;
    title: string;
    kind: string;
    content?: string;
    metadata?: any;
  } | {
    data: {
      id: string;
      title: string;
      kind: string;
      content?: string;
      metadata?: any;
    };
    success?: boolean;
    error?: string;
  } | {
    // Streaming update from tool
    type: 'metadata' | 'status' | 'error';
    data?: any;
    status?: string;
    title?: string;
    message?: string;
  };
  error?: any;
  message?: any; // For streaming updates
}

const DocumentUpdateLoading = memo<{ input?: any }>(({ input }) => (
  <motion.div
    className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-850 border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  >
    <div className="flex-shrink-0">
      <div className="w-8 h-8 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse flex items-center justify-center">
        <PenTool className="w-4 h-4 text-neutral-400" />
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Updating document...
        </span>
      </div>
      {input?.description && (
        <div className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
          {input.description}
        </div>
      )}
      {input?.id && (
        <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 font-mono">
          ID: {input.id.slice(0, 8)}...
        </div>
      )}
    </div>
  </motion.div>
));

const DocumentUpdateLoaded = memo<{ 
  result: any; 
  input?: any; 
  isWorkingVersion?: boolean;
  onViewDocument: (event: React.MouseEvent) => void;
  content?: string;
}>(({ result, input, isWorkingVersion, onViewDocument, content }) => {
  const displayContent = content || result.content || '';
  const isImage = result.kind === 'image';
  const isCode = result.kind === 'code';
  
  // Get appropriate icon based on document kind
  const getIcon = () => {
    switch(result.kind) {
      case 'image': return <Image className="w-4 h-4 text-muted-foreground" />;
      case 'code': return <Code className="w-4 h-4 text-muted-foreground" />;
      default: return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };
  
  return (
    <motion.article
      onClick={onViewDocument}
      className={cn(
        "group relative flex flex-col min-h-0",
        "bg-card hover:bg-accent/5",
        "border hover:border-border",
        "rounded-lg overflow-hidden",
        "cursor-pointer transition-all duration-200",
        "hover:shadow-md",
        "animate-in fade-in-50 duration-300 fill-mode-backwards",
        isWorkingVersion
          ? "border-orange-500/50 ring-1 ring-orange-500/10 shadow-xl shadow-orange-500/5"
          : "border-border/50"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Card Content */}
      <div className="flex-1 p-4 space-y-3">
        {/* Header with icon and title */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-md overflow-hidden bg-muted flex items-center justify-center">
            <div className="relative">
              {getIcon()}
              <PenTool className="w-3 h-3 text-orange-500 absolute -bottom-1 -right-1" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {result.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {result.kind && (
                <span className="text-xs text-muted-foreground capitalize">
                  {result.kind}
                </span>
              )}
              {result.version ? (
                <span className="text-xs text-orange-600 dark:text-orange-400">
                  Version {result.version}
                </span>
              ) : (
                <span className="text-xs text-orange-600 dark:text-orange-400">
                  Updated
                </span>
              )}
            </div>
          </div>
        </div>
        
        
        {/* Content Preview */}
        {displayContent && !isImage && (
          <div className="text-xs prose prose-sm dark:prose-invert max-w-none">
            <Response>
              {displayContent.length > 400 
                ? displayContent.substring(0, 400) + '...'
                : displayContent}
            </Response>
          </div>
        )}
        
        {/* Image preview placeholder */}
        {isImage && (
          <div className="p-3 bg-muted/30 rounded-md border border-border/30">
            <div className="flex items-center justify-center h-24">
              <div className="text-center">
                <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Image updated
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Click to view changes
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">
            Updated successfully
          </span>
        </div>
        
        {/* Change Description - subtle at bottom */}
        {input?.description && (
          <p className="text-xs text-muted-foreground/70 italic">
            {input.description}
          </p>
        )}
      </div>
      
      {/* Hover overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.article>
  );
});

const DocumentUpdateError = memo<{ error: any; input?: any }>(({ error, input }) => (
  <div className="flex items-center gap-2 p-4 rounded-lg bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-850 border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm">
    <div className="flex-shrink-0">
      <AlertCircle className="w-4 h-4 text-neutral-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        Failed to update document
      </p>
    </div>
  </div>
));

DocumentUpdateLoading.displayName = 'DocumentUpdateLoading';
DocumentUpdateLoaded.displayName = 'DocumentUpdateLoaded';
DocumentUpdateError.displayName = 'DocumentUpdateError';

export const DocumentUpdate = memo<DocumentUpdateProps>(({
  toolCallId,
  state,
  input,
  output,
  error,
  message
}) => {
  const { createArtifact, updateArtifactContent, openArtifact, artifactsState } = useArtifactsContext();
  const [containerDimensions, setContainerDimensions] = useState({ width: 400, height: 80 });
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
  const [documentMetadata, setDocumentMetadata] = useState<{
    id?: string;
    title?: string;
    kind?: string;
    version?: number;
    author?: string;
    isWorkingVersion?: boolean;
  }>({});
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  
  // Debug state override
  const [debugState, setDebugState] = useState<string | null>(null);
  const effectiveState = debugState || state;
  
  const isLoading = effectiveState === 'input-available';
  const isComplete = effectiveState === 'output-available';
  const isError = effectiveState === 'output-error';

  // Process streaming updates
  useEffect(() => {
    // Check if output itself is a streaming update (direct from tool)
    if (output && typeof output === 'object') {
      // Handle single update object directly from the tool
      if ('type' in output && (output.type === 'metadata' || output.type === 'status') && output.data) {
        const data = output.data;
        
        // Update document metadata
        if (data.documentId || data.title || data.kind || data.version !== undefined) {
          setDocumentMetadata(prev => ({
            ...prev,
            id: data.documentId || prev.id,
            title: data.title || prev.title,
            kind: data.kind || prev.kind,
            version: data.version ?? prev.version,
            author: data.author || prev.author,
            isWorkingVersion: data.isWorkingVersion ?? prev.isWorkingVersion
          }));
        }
        
        // Handle document-open phase
        if (data.phase === 'document-open' && !isDocumentOpen && data.documentId) {
          setIsDocumentOpen(true);
          
          // Open the artifact immediately with existing content
          const validKind = getValidKind(data.kind || 'text');
          createArtifact({
            documentId: data.documentId,
            kind: validKind,
            title: data.title || 'Untitled',
            content: data.content || '',
            boundingBox: {
              top: window.innerHeight / 2 - 100,
              left: window.innerWidth / 2 - 200,
              width: 400,
              height: 200,
            }
          });
        }
        
        // Handle content streaming
        if (data.phase === 'content-streaming' && data.content && data.documentId) {
          setStreamingContent(data.content);
          // Update artifact content live
          updateArtifactContent?.(data.documentId, data.content, true);
        }
      }
    }
  }, [output, isDocumentOpen, createArtifact, updateArtifactContent]);
  
  // Helper function to get valid artifact kind
  const getValidKind = (kind: string): 'text' | 'code' | 'image' | 'sheet' => {
    switch (kind) {
      case 'text':
      case 'code': 
      case 'image':
      case 'sheet':
        return kind;
      default:
        return 'text';
    }
  };
  

  const isWorkingVersion = useMemo(() => {
    const documentData = documentMetadata.id ? documentMetadata : (output as any)?.data || output;
    const documentId = documentData?.id;
    const documentVersion = documentData?.version;
    
    if (!documentId) return false;
    
    // Check if this document exists in artifacts and if its version matches the working version
    const artifact = artifactsState.artifacts[documentId];
    if (!artifact) return false;
    
    // If document has no version info, check if it's the working version based on workingVersion field
    if (documentVersion === undefined) {
      return artifact.workingVersion !== undefined;
    }
    
    // Check if the document's version matches the working version
    return documentVersion === artifact.workingVersion;
  }, [output, documentMetadata, artifactsState.artifacts]);
  
  useEffect(() => {
    if (isLoading) {
      setContainerDimensions({ width: 400, height: 80 });
    } else if (isComplete || isError) {
      setContainerDimensions({ width: 450, height: 120 });
    }
  }, [isLoading, isComplete, isError]);

  const handleViewDocument = () => {
    const documentData = documentMetadata.id ? documentMetadata : (output as any)?.data || output;
    const documentId = documentData?.id;
    
    if (!documentId) {
      toast.error('Document ID not available');
      return;
    }

    openArtifact(documentId, documentData?.version).catch(console.error);
  };

  return (
    <>
      {/* Debug Controls */}
      {isDebugMode && (
        <div className="p-3 mb-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700">
          <div className="text-xs font-medium mb-2">Debug Mode - Override State:</div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setDebugState(null)}
              className={`px-2 py-1 text-xs rounded ${!debugState ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
            >
              Normal ({state})
            </button>
            <button
              onClick={() => setDebugState('input-available')}
              className={`px-2 py-1 text-xs rounded ${debugState === 'input-available' ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
            >
              Loading
            </button>
            <button
              onClick={() => setDebugState('output-available')}
              className={`px-2 py-1 text-xs rounded ${debugState === 'output-available' ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
            >
              Loaded
            </button>
            <button
              onClick={() => setDebugState('output-error')}
              className={`px-2 py-1 text-xs rounded ${debugState === 'output-error' ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
            >
              Error
            </button>
          </div>
        </div>
      )}

      <div className="my-4">
        <AnimatePresence mode="wait">
          {isLoading && (
            <DocumentUpdateLoading key="loading" input={input} />
          )}
          
          {isComplete && (output || documentMetadata.id) && (
            <DocumentUpdateLoaded 
              key="loaded"
              result={documentMetadata.id ? documentMetadata : (output as any)?.data || output}
              input={input}
              isWorkingVersion={isWorkingVersion}
              onViewDocument={handleViewDocument}
              content={streamingContent || ((output as any)?.data?.content) || (output as any)?.content}
            />
          )}
          
          {isError && (
            <DocumentUpdateError 
              key="error"
              error={error}
              input={input}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
});

DocumentUpdate.displayName = 'DocumentUpdate';