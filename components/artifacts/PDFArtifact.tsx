'use client';

import { useState } from 'react';
import type { ArtifactData } from '@/contexts/artifacts-context';

interface PDFArtifactProps {
  artifact: ArtifactData;
}

export function PDFArtifact({ artifact }: PDFArtifactProps) {
  const [error, setError] = useState(false);
  const s3Url = artifact.content;

  return (
    <div className="w-full h-full bg-background relative flex flex-col">
      <div className="flex-1 overflow-hidden">
        {!error ? (
          <iframe
            src={`/api/s3/preview?url=${encodeURIComponent(s3Url)}`}
            className="w-full h-full border-0"
            title={artifact.title}
            onError={() => setError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Unable to preview PDF</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
