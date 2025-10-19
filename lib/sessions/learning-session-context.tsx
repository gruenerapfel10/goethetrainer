'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { 
  Session, 
  SessionType, 
  SessionStats,
  ReadingSession,
  ListeningSession,
  WritingSession,
  SpeakingSession
} from './types';

interface LearningSessionContextType {
  activeSession: Session | null;
  isLoading: boolean;
  error: string | null;
  stats: SessionStats | null;
  
  // Session actions
  startSession: (type: SessionType, metadata?: Record<string, any>) => Promise<Session | null>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  endSession: (status?: 'completed' | 'abandoned') => Promise<void>;
  
  // Unified session update
  updateSessionProgress: (data: Record<string, any>) => Promise<void>;
  
  // Utility functions
  refreshStats: () => Promise<void>;
  clearError: () => void;
}

const LearningSessionContext = createContext<LearningSessionContextType | null>(null);

export function useLearningSession() {
  const context = useContext(LearningSessionContext);
  if (!context) {
    throw new Error('useLearningSession must be used within LearningSessionProvider');
  }
  return context;
}

export function LearningSessionProvider({ children }: { children: React.ReactNode }) {
  const { data: authSession } = useSession();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);

  // Load user stats on mount
  useEffect(() => {
    if (authSession?.user?.email) {
      refreshStats();
    }
  }, [authSession?.user?.email]);

  // Check for active sessions on mount
  useEffect(() => {
    if (authSession?.user?.email) {
      checkActiveSession();
    }
  }, [authSession?.user?.email]);

  const checkActiveSession = async () => {
    if (!authSession?.user?.email) return;
    
    try {
      const response = await fetch('/api/sessions/active');
      if (response.ok) {
        const sessions = await response.json();
        if (sessions.length > 0) {
          setActiveSession(sessions[0]);
        }
      }
    } catch (err) {
      console.error('Error checking active session:', err);
    }
  };

  const refreshStats = useCallback(async () => {
    if (!authSession?.user?.email) return;
    
    try {
      const response = await fetch('/api/sessions/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [authSession?.user?.email]);

  const startSession = useCallback(async (
    type: SessionType, 
    metadata?: Record<string, any>
  ): Promise<Session | null> => {
    if (!authSession?.user?.email) {
      setError('You must be logged in to start a session');
      return null;
    }

    // End any existing active session
    if (activeSession) {
      await endSession('abandoned');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, metadata })
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const session = await response.json();
      setActiveSession(session);
      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authSession?.user?.email, activeSession]);

  const pauseSession = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'active') return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/pause`, {
        method: 'POST'
      });

      if (response.ok) {
        const updated = await response.json();
        setActiveSession(updated);
      }
    } catch (err) {
      setError('Failed to pause session');
    } finally {
      setIsLoading(false);
    }
  }, [activeSession]);

  const resumeSession = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'paused') return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/resume`, {
        method: 'POST'
      });

      if (response.ok) {
        const updated = await response.json();
        setActiveSession(updated);
      }
    } catch (err) {
      setError('Failed to resume session');
    } finally {
      setIsLoading(false);
    }
  }, [activeSession]);

  const endSession = useCallback(async (status: 'completed' | 'abandoned' = 'completed') => {
    if (!activeSession) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setActiveSession(null);
        await refreshStats();
      }
    } catch (err) {
      setError('Failed to end session');
    } finally {
      setIsLoading(false);
    }
  }, [activeSession, refreshStats]);

  const updateSessionProgress = useCallback(async (data: Record<string, any>) => {
    if (!activeSession) return;

    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, type: activeSession.type })
      });

      if (response.ok) {
        const updated = await response.json();
        setActiveSession(updated);
      } else {
        const error = await response.json();
        setError(error.message || `Failed to update ${activeSession.type} progress`);
      }
    } catch (err) {
      setError(`Failed to update ${activeSession?.type || 'session'} progress`);
    }
  }, [activeSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <LearningSessionContext.Provider
      value={{
        activeSession,
        isLoading,
        error,
        stats,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        updateSessionProgress,
        refreshStats,
        clearError
      }}
    >
      {children}
    </LearningSessionContext.Provider>
  );
}