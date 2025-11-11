'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { useChat } from '@/contexts/chat-context';
import { useArtifactsContext } from '@/contexts/artifacts-context';

interface WebSource {
  url: string;
  title: string;
  favicon?: string;
}

interface WebSourcesContextType {
  sources: WebSource[];
  currentIndex: number;
  addSources: (newSources: WebSource[]) => void;
  navigateToSource: (index: number) => void;
  clearSources: () => void;
  isActive: boolean;
}

const WebSourcesContext = createContext<WebSourcesContextType | undefined>(undefined);

export function WebSourcesProvider({ children }: { children: ReactNode }) {
  const { activeArtifact: artifact, createArtifact, artifactsState } = useArtifactsContext();
  const { } = useChat();
  const [sources, setSources] = useState<WebSource[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const addSources = React.useCallback((newSources: WebSource[]) => {
    console.log('🌐 Adding sources to global context:', newSources.length);
    setSources(newSources);
    setCurrentIndex(0);
    // Don't automatically open - wait for user to click
  }, []);

  const navigateToSource = React.useCallback((index: number) => {
    if (index >= 0 && index < sources.length) {
      const source = sources[index];
      setCurrentIndex(index);
      
      console.log('🔄 Navigating to source:', index, source.title);
      
      // Update the artifact with the new source
      createArtifact({
        documentId: artifact?.documentId || `webpage-${Date.now()}`,
        kind: 'webpage' as any,
        title: source.title,
        content: source.url
      });
    }
  }, [sources, artifact?.documentId, createArtifact]);

  const clearSources = React.useCallback(() => {
    console.log('🗑️ Clearing all sources');
    setSources([]);
    setCurrentIndex(0);
  }, []);

  const isActive = sources.length > 0 && artifact?.kind === 'webpage' && artifactsState.isVisible;

  const contextValue = React.useMemo(
    () => ({
      sources,
      currentIndex,
      addSources,
      navigateToSource,
      clearSources,
      isActive
    }),
    [sources, currentIndex, addSources, navigateToSource, clearSources, isActive]
  );

  return (
    <WebSourcesContext.Provider value={contextValue}>
      {children}
    </WebSourcesContext.Provider>
  );
}

export function useWebSources() {
  const context = useContext(WebSourcesContext);
  if (context === undefined) {
    throw new Error('useWebSources must be used within a WebSourcesProvider');
  }
  return context;
}