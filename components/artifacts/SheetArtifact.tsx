'use client';

import { SpreadsheetEditor } from '../sheet-editor';
import type { ArtifactData } from '@/contexts/artifacts-context';

interface SheetArtifactProps {
  artifact: ArtifactData;
  onSaveContent: (content: string, debounce: boolean) => void;
}

export function SheetArtifact({ artifact, onSaveContent }: SheetArtifactProps) {
  const isCurrentVersion = artifact.currentVersionIndex === (artifact.versions?.length ?? 1) - 1;

  return (
    <SpreadsheetEditor
      content={artifact.content}
      saveContent={(content: string, isCurrent: boolean) => onSaveContent(content, !isCurrent)}
      status={artifact.status}
      isCurrentVersion={isCurrentVersion}
      currentVersionIndex={artifact.currentVersionIndex ?? 0}
    />
  );
}
