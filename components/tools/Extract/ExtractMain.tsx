'use client';

import React, { useMemo } from 'react';
import { useArtifactsContext } from '@/contexts/artifacts-context';
import type { ExtractedResult, ExtractSummary } from './utils';
import { Loading } from './Loading';
import { Error } from './Error';
import { Loaded } from './Loaded';
import { NoResults } from './NoResults';

interface ExtractMainProps {
  toolCallId: string;
  input?: {
    urls: string[];
    prompt: string;
  };
  output?: {
    data?: ExtractedResult[];
    success?: boolean;
    summary?: ExtractSummary;
    error?: string;
  };
  state: string;
  message?: any;
}

export function ExtractMain({
  toolCallId,
  input,
  output,
  state,
  message,
}: ExtractMainProps) {
  const { activeArtifact: artifact, artifactsState } = useArtifactsContext();
  const isArtifactVisible = artifactsState.isVisible;
  
  // Determine extraction state
  const isLoading = state === 'input-available' || state === 'input-streaming';
  const isComplete = state === 'output-available';
  const isError = state === 'output-error';
  
  // Process extraction results
  const results = useMemo(() => {
    if (!output?.data) return [];
    return output.data;
  }, [output?.data]);
  
  const hasResults = results.length > 0;
  const hasError = isError || output?.error;
  
  return (
    <div className="space-y-3 mx-auto w-full py-4">
      {/* Loading State */}
      {isLoading && (
        <Loading urls={input?.urls} prompt={input?.prompt} />
      )}
      
      {/* Error State */}
      {hasError && !isLoading && (
        <Error error={output?.error} prompt={input?.prompt} />
      )}
      
      {/* Loaded State with Results */}
      {isComplete && hasResults && !hasError && (
        <Loaded results={results} summary={output?.summary} />
      )}
      
      {/* No Results State */}
      {isComplete && !hasResults && !hasError && (
        <NoResults prompt={input?.prompt} urls={input?.urls} />
      )}
    </div>
  );
}

export default ExtractMain;