import { memo } from 'react';

import type { ArtifactKind } from '@/lib/artifacts/artifact-registry';
import { FileIcon, LoaderIcon, MessageIcon, PencilEditIcon } from './icons';
import { toast } from 'sonner';
import { useArtifactsContext } from '@/contexts/artifacts-context';
import { useTranslations } from 'next-intl';

interface DocumentToolResultProps {
  type: 'create' | 'update' | 'request-suggestions';
  result: { id: string; title: string; kind: ArtifactKind };
  isReadonly: boolean;
}

function PureDocumentToolResult({
  type,
  result,
  isReadonly,
}: DocumentToolResultProps) {
  const { createArtifact } = useArtifactsContext();
  const t = useTranslations();
  const getActionText = (
    type: 'create' | 'update' | 'request-suggestions',
    tense: 'present' | 'past',
  ) => {
    switch (type) {
      case 'create':
        return tense === 'present'
          ? t('document.actions.creating')
          : t('document.actions.created');
      case 'update':
        return tense === 'present'
          ? t('document.actions.updating')
          : t('document.actions.updated');
      case 'request-suggestions':
        return tense === 'present'
          ? t('document.actions.requestingSuggestions')
          : t('document.actions.suggestionsAdded');
      default:
        return null;
    }
  };

  return (
    <button
      type="button"
      className="bg-background cursor-pointer border py-2 px-3 rounded-xl w-fit flex flex-row gap-3 items-start"
      onClick={(event) => {
        if (isReadonly) {
          toast.error(t('document.errors.viewSharedFiles'));
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();

        const boundingBox = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        createArtifact({
          documentId: result.id,
          kind: result.kind as any,
          title: result.title,
          content: '',
          boundingBox,
        });
      }}
    >
      <div className="text-muted-foreground mt-1">
        {type === 'create' ? (
          <FileIcon />
        ) : type === 'update' ? (
          <PencilEditIcon />
        ) : type === 'request-suggestions' ? (
          <MessageIcon />
        ) : null}
      </div>
      <div className="text-left">
        {`${getActionText(type, 'past')} "${result.title}"`}
      </div>
    </button>
  );
}

export const DocumentToolResult = memo(PureDocumentToolResult, () => true);

interface DocumentToolCallProps {
  type: 'create' | 'update' | 'request-suggestions';
  args: { title: string };
  isReadonly: boolean;
}

function PureDocumentToolCall({
  type,
  args,
  isReadonly,
}: DocumentToolCallProps) {
  const { setArtifactsVisible } = useArtifactsContext();
  const t = useTranslations();

  const getActionText = (
    type: 'create' | 'update' | 'request-suggestions',
    tense: 'present' | 'past',
  ) => {
    switch (type) {
      case 'create':
        return tense === 'present'
          ? t('document.actions.creating')
          : t('document.actions.created');
      case 'update':
        return tense === 'present'
          ? t('document.actions.updating')
          : t('document.actions.updated');
      case 'request-suggestions':
        return tense === 'present'
          ? t('document.actions.requestingSuggestions')
          : t('document.actions.suggestionsAdded');
      default:
        return null;
    }
  };

  return (
    <button
      type="button"
      className="cursor pointer w-fit border py-2 px-3 rounded-xl flex flex-row items-start justify-between gap-3"
      onClick={(event) => {
        if (isReadonly) {
          toast.error(t('document.errors.viewSharedFiles'));
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();

        const boundingBox = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        setArtifactsVisible(true);
      }}
    >
      <div className="flex flex-row gap-3 items-start">
        <div className="text-zinc-500 mt-1">
          {type === 'create' ? (
            <FileIcon />
          ) : type === 'update' ? (
            <PencilEditIcon />
          ) : type === 'request-suggestions' ? (
            <MessageIcon />
          ) : null}
        </div>

        <div className="text-left">
          {`${getActionText(type, 'present')} ${
            args.title ? `"${args.title}"` : ''
          }`}
        </div>
      </div>

      <div className="animate-spin mt-1">{<LoaderIcon />}</div>
    </button>
  );
}

export const DocumentToolCall = memo(PureDocumentToolCall, () => true);
