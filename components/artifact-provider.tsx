'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useArtifact } from '@/hooks/use-artifact';

interface ArtifactContextProps {
  isOpen: boolean;
  width: number; // percentage
  setWidth: (width: number) => void;
}

const ArtifactContext = createContext<ArtifactContextProps | null>(null);

export function useArtifactPanel() {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error('useArtifactPanel must be used within ArtifactProvider');
  }
  return context;
}

export function ArtifactProvider({ children }: { children: React.ReactNode }) {
  const { artifact } = useArtifact();
  const [width, setWidth] = useState(50); // 50% default width

  const contextValue = React.useMemo(
    () => ({
      isOpen: artifact.isVisible,
      width,
      setWidth,
    }),
    [artifact.isVisible, width]
  );

  return (
    <ArtifactContext.Provider value={contextValue}>
      {children}
    </ArtifactContext.Provider>
  );
}