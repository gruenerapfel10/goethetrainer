'use client';

import { CodeEditor } from '../code-editor';
import type { ArtifactData } from '@/contexts/artifacts-context';

interface CodeArtifactProps {
  artifact: ArtifactData;
  onSaveContent: (content: string) => void;
}

export function CodeArtifact({ artifact, onSaveContent }: CodeArtifactProps) {
  const isCurrentVersion = artifact.currentVersionIndex === (artifact.versions?.length ?? 1) - 1;

  return (
    <CodeEditor
      content={artifact.content}
      isCurrentVersion={isCurrentVersion}
      currentVersionIndex={artifact.currentVersionIndex ?? 0}
      status={artifact.status}
      onSaveContent={onSaveContent}
      suggestions={[]}
    />
  );
}
