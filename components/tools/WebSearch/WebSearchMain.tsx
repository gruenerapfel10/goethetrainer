'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useArtifactsContext } from '@/contexts/artifacts-context';
import type { SearchResult } from './utils';
import { Loading } from './Loading';
import { Error } from './Error';
import { Loaded } from './Loaded';
import { NoResults } from './NoResults';

interface WebSearchProps {
  toolCallId: string;
  input?: {
    query: string;
    maxResults?: number;
  };
  output?: SearchResult[] | {
    data?: SearchResult[];
    success?: boolean;
    error?: string;
  };
  state: string;
}

export function WebSearchMain({ 
  toolCallId, 
  input, 
  output,
  state 
}: WebSearchProps) {
  const { activeArtifact: artifact, artifactsState, addSourcesToArtifact } = useArtifactsContext();
  const isArtifactVisible = artifactsState.isVisible;
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
  
  // Debug state override
  const [debugState, setDebugState] = useState<string | null>(null);
  const effectiveState = debugState || state;

  // Determine search state
  const isLoading = effectiveState === 'input-available' || effectiveState === 'input-streaming';
  const isComplete = effectiveState === 'output-available';
  const hasError = effectiveState === 'output-error' || (output && !Array.isArray(output) && (output.success === false || output.error));
  
  // Process search results
  const searchResults = useMemo(() => {
    if (!output) return [];
    
    // Handle new native array format
    if (Array.isArray(output)) {
      return output;
    }
    
    // Handle legacy wrapped format
    if (output.data && Array.isArray(output.data)) {
      return output.data;
    }
    
    return [];
  }, [output]);
  
  // Track if we've already added sources for this search
  const [sourcesAdded, setSourcesAdded] = useState(false);
  
  // Automatically add sources when search completes and we have results
  useEffect(() => {
    if (isComplete && searchResults.length > 0 && !hasError && !sourcesAdded) {
      console.log('🔍 WebSearch completed, adding sources:', searchResults.length);
      
      const webSources = searchResults.map(result => ({
        url: result.url,
        title: result.title,
        favicon: undefined
      }));
      
      const existingWebpageArtifacts = Object.values(artifactsState.artifacts).filter(
        (art: any) => art.kind === 'webpage'
      );
      
      if (artifact && artifact.kind === 'webpage') {
        addSourcesToArtifact(artifact.documentId, webSources, 0);
      } else if (existingWebpageArtifacts.length > 0) {
        const existingArtifact = existingWebpageArtifacts[0] as any;
        addSourcesToArtifact(existingArtifact.documentId, webSources, 0);
      }
      
      setSourcesAdded(true);
    }
  }, [isComplete, searchResults, hasError, sourcesAdded, artifact, addSourcesToArtifact, artifactsState.artifacts]);
  
  // Reset sourcesAdded when search state changes
  useEffect(() => {
    if (!isComplete) {
      setSourcesAdded(false);
    }
  }, [isComplete]);


  return (
    <div className="space-y-4 mx-auto w-full my-4">
      {/* Debug Controls */}
      {isDebugMode && (
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700">
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
            <button
              onClick={() => setDebugState('no-results')}
              className={`px-2 py-1 text-xs rounded ${debugState === 'no-results' ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
            >
              No Results
            </button>
          </div>
        </div>
      )}

      {/* Search Status Header */}
      <div className="flex items-center gap-2">
        {isLoading && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">
              Searching for: {input?.query || 'Processing...'}
            </span>
          </>
        )}
        {isComplete && !hasError && (
          <>
            <Search className="h-4 w-4 text-neutral-500" />
            <span className="text-sm font-medium">
              Found {searchResults.length} results for: {input?.query}
            </span>
          </>
        )}
      </div>

      {/* Render appropriate state component */}
      {isLoading && <Loading query={input?.query} isArtifactVisible={isArtifactVisible} />}
      
      {((hasError && !isLoading) || debugState === 'output-error') && (
        <Error error={Array.isArray(output) ? undefined : output?.error} query={input?.query} />
      )}
      
      {((isComplete && searchResults.length > 0 && !hasError) || debugState === 'output-available') && (
        <Loaded 
          searchResults={searchResults.length > 0 ? searchResults : [
            { title: 'Example Search Result', url: 'https://example.com', description: 'This is a sample search result for testing' },
            { title: 'Another Result', url: 'https://example2.com', description: 'Another sample result with a longer description' },
            { title: 'Third Result', url: 'https://example3.com', description: 'A third example result' }
          ]}
          isArtifactVisible={isArtifactVisible}
        />
      )}
      
      {((isComplete && searchResults.length === 0 && !hasError) || debugState === 'no-results') && (
        <NoResults query={input?.query} isArtifactVisible={isArtifactVisible} />
      )}
    </div>
  );
}