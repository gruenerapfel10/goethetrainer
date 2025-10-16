'use client';

import Editor from '../text-editor';
import type { ArtifactData } from '@/contexts/artifacts-context';

interface DocumentArtifactProps {
  artifact: ArtifactData;
  onSaveContent?: (content: string) => void;
}

export function DocumentArtifact({ artifact, onSaveContent }: DocumentArtifactProps) {
  const isCurrentVersion = true;

  return (
    <Editor
      content={artifact.content}
      isCurrentVersion={isCurrentVersion}
      currentVersionIndex={0}
      status={artifact.status}
      onSaveContent={onSaveContent || (() => {})}
      suggestions={[]}
    />
  );
}
