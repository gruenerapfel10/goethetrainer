'use client';

import {
  memo,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { ArtifactKind } from '@/lib/artifacts/artifact-registry';
import { FileIcon, FullscreenIcon, ImageIcon, LoaderIcon } from './icons';
import { cn, fetcher } from '@/lib/utils';
import type { Document } from '@/lib/db/queries';
import { InlineDocumentSkeleton } from './document-skeleton';
import useSWR from 'swr';
import { DocumentToolCall, DocumentToolResult } from './document';
import { useArtifactsContext } from '@/contexts/artifacts-context';
import equal from 'fast-deep-equal';
import { UnifiedArtifactRenderer } from './editors/EditorFactory';

interface DocumentPreviewProps {
  isReadonly: boolean;
  result?: any;
  args?: any;
}

export function DocumentPreview({
  isReadonly,
  result,
  args,
}: DocumentPreviewProps) {
  const { activeArtifact: artifact, createArtifact, loadArtifact, setArtifactsVisible } = useArtifactsContext();

  const { data: documents, isLoading: isDocumentsFetching } = useSWR<
    Array<Document>
  >(result ? `/api/document?id=${result.id}` : null, fetcher);

  const previewDocument = useMemo(() => documents?.[0], [documents]);
  const hitboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const boundingBox = hitboxRef.current?.getBoundingClientRect();

    if (artifact?.documentId && boundingBox) {
      // Update artifact bounding box if needed
    }
  }, [artifact?.documentId]);

  if (false) { // Artifact visibility check removed
    if (result) {
      return (
        <DocumentToolResult
          type="create"
          result={{ id: result.id, title: result.title, kind: result.kind }}
          isReadonly={isReadonly}
        />
      );
    }

    if (args) {
      return (
        <DocumentToolCall
          type="create"
          args={{ title: args.title }}
          isReadonly={isReadonly}
        />
      );
    }
  }

  if (isDocumentsFetching) {
    return <LoadingSkeleton artifactKind={result.kind ?? args.kind} />;
  }

  const document: Document | null = previewDocument
    ? previewDocument
    : artifact?.status === 'streaming'
    ? {
        title: artifact.title,
        kind: artifact.kind,
        content: artifact.content,
        id: artifact.documentId,
        createdAt: new Date(),
        userId: 'noop',
      } as any
    : null;

  if (!document) return <LoadingSkeleton artifactKind={(artifact?.kind ?? 'text') as any} />;

  return (
    <div className="relative w-full cursor-pointer">
      <HitboxLayer
        hitboxRef={hitboxRef}
        result={result}
        createArtifact={createArtifact}
        loadArtifact={loadArtifact}
        setArtifactsVisible={setArtifactsVisible}
      />
      <DocumentHeader
        title={document.title}
        kind={document.kind as any}
        isStreaming={artifact?.status === 'streaming'}
      />
      <DocumentContent document={document} />
    </div>
  );
}

const LoadingSkeleton = ({ artifactKind }: { artifactKind: any }) => (
  <div className="w-full">
    <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-center justify-between dark:bg-muted h-[57px] border-documentPreview-border-dark border-b-0">
      <div className="flex flex-row items-center gap-3">
        <div className="text-muted-foreground">
          <div className="animate-pulse rounded-md size-4 bg-documentPreview-skeleton-bg" />
        </div>
        <div className="animate-pulse rounded-lg h-4 bg-documentPreview-skeleton-bg w-24" />
      </div>
      <div>
        <FullscreenIcon />
      </div>
    </div>
    {artifactKind === 'image' ? (
      <div className="overflow-y-scroll border rounded-b-2xl bg-muted border-t-0 border-documentPreview-border-dark">
        <div className="animate-pulse h-[257px] bg-documentPreview-skeleton-bg w-full" />
      </div>
    ) : (
      <div className="overflow-y-scroll border rounded-b-2xl p-8 pt-4 bg-muted border-t-0 border-documentPreview-border-dark">
        <InlineDocumentSkeleton />
      </div>
    )}
  </div>
);

const PureHitboxLayer = ({
  hitboxRef,
  result,
  createArtifact,
  loadArtifact,
  setArtifactsVisible,
}: {
  hitboxRef: React.RefObject<HTMLDivElement>;
  result: any;
  createArtifact: any;
  loadArtifact: any;
  setArtifactsVisible: any;
}) => {
  const handleClick = useCallback(
    async (event: MouseEvent<HTMLElement>) => {
      const boundingBox = event.currentTarget.getBoundingClientRect();

      if (result?.id) {
        console.log('📄 [DOCUMENT PREVIEW] Loading existing document:', {
          documentId: result.id,
          title: result.title,
          kind: result.kind
        });

        // For existing documents, load them with version history
        try {
          await loadArtifact(result.id);
          console.log('📄 [DOCUMENT PREVIEW] Document loaded successfully');
          
          // Set the bounding box after loading
          setTimeout(() => {
            // Small delay to ensure the artifact state is updated
            setArtifactsVisible(true);
            console.log('📄 [DOCUMENT PREVIEW] Artifact set to visible');
          }, 50);
        } catch (error) {
          console.error('Failed to load existing document:', error);
          // Fallback to creating new artifact if load fails
          createArtifact({
            documentId: result.id,
            kind: result.kind,
            title: result.title,
            content: '',
            boundingBox: {
              left: boundingBox.x,
              top: boundingBox.y,
              width: boundingBox.width,
              height: boundingBox.height,
            },
          });
        }
      } else {
        // For new artifacts (streaming), create them with the centralized manager
        createArtifact({
          documentId: result?.id || 'new',
          kind: result?.kind || 'text',
          title: result?.title || 'New Document',
          content: '',
          boundingBox: {
            left: boundingBox.x,
            top: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height,
          },
        });
      }
    },
    [createArtifact, loadArtifact, setArtifactsVisible, result],
  );

  return (
    <div
      className="size-full absolute top-0 left-0 rounded-xl z-10"
      ref={hitboxRef}
      onClick={handleClick}
      role="presentation"
      aria-hidden="true"
    >
      <div className="w-full p-4 flex justify-end items-center">
        <div className="absolute right-[9px] top-[13px] p-2 hover:bg-button-outline-hover rounded-md ">
          <FullscreenIcon />
        </div>
      </div>
    </div>
  );
};

const HitboxLayer = memo(PureHitboxLayer, (prevProps, nextProps) => {
  if (!equal(prevProps.result, nextProps.result)) return false;
  return true;
});

const PureDocumentHeader = ({
  title,
  kind,
  isStreaming,
}: {
  title: string;
  kind: ArtifactKind;
  isStreaming: boolean;
}) => (
  <div className="p-4 border rounded-t-2xl flex flex-row gap-2 items-start sm:items-center justify-between dark:bg-muted border-b-0 border-documentPreview-border-dark">
    <div className="flex flex-row items-start sm:items-center gap-3">
      <div className="text-muted-foreground">
        {isStreaming ? (
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        ) : (kind as any) === 'image' ? (
          <ImageIcon />
        ) : (
          <FileIcon />
        )}
      </div>
      <div className="-translate-y-1 sm:translate-y-0 font-medium">{title}</div>
    </div>
    <div className="w-8" />
  </div>
);
const DocumentHeader = memo(PureDocumentHeader, (prevProps, nextProps) => {
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.isStreaming !== nextProps.isStreaming) return false;

  return true;
});

const DocumentContent = ({ document }: { document: Document }) => {
  const { activeArtifact: artifact } = useArtifactsContext();
  const containerClassName = cn(
    'h-[257px] overflow-y-scroll border rounded-b-2xl dark:bg-muted border-t-0 border-documentPreview-border-dark',
    {
      'p-4 sm:px-14 sm:py-16': (document.kind as any) === 'text',
      'p-0': (document.kind as any) === 'code',
      'p-4': (document.kind as any) === 'sheet',
    },
  );

  return (
    <div className={containerClassName}>
      <UnifiedArtifactRenderer
        content={document.content ?? ''}
        kind={document.kind as any}
        status={artifact?.status ?? 'idle'}
        onContentChange={() => {}}
      />
    </div>
  );
};
