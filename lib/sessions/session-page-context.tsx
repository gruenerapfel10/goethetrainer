'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { SessionTypeEnum, getSessionConfig } from './session-registry';
import { useLearningSession } from './learning-session-context';
import type { SessionConfig } from './session-registry';
import './configs'; // Import to register all configs

interface SessionPageContextType {
  sessionType: SessionTypeEnum;
  config: SessionConfig;
  metadata: SessionConfig['metadata'];
  features: SessionConfig['features'];
  defaults: SessionConfig['defaults'];
}

const SessionPageContext = createContext<SessionPageContextType | null>(null);

export function useSessionPage() {
  const context = useContext(SessionPageContext);
  if (!context) {
    throw new Error('useSessionPage must be used within SessionPageProvider');
  }
  return context;
}

interface SessionPageProviderProps {
  sessionType: SessionTypeEnum;
  children: React.ReactNode;
}

export function SessionPageProvider({ sessionType, children }: SessionPageProviderProps) {
  const contextValue = useMemo(() => {
    const config = getSessionConfig(sessionType);
    return {
      sessionType,
      config,
      metadata: config.metadata,
      features: config.features,
      defaults: config.defaults,
    };
  }, [sessionType]);

  return (
    <SessionPageContext.Provider value={contextValue}>
      {children}
    </SessionPageContext.Provider>
  );
}