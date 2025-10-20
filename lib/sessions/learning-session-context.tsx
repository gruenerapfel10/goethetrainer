'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SessionTypeEnum } from './session-registry';
import type {
  Session,
  SessionStats,
} from './types';
import type { Question, QuestionResult } from './questions/question-types';
import type { QuestionTypeName } from './questions/question-registry';

export enum QuestionStatus {
  GENERATING = 'generating',
  LOADED = 'loaded',
  ERROR = 'error'
}

export interface SessionQuestion extends Question {
  teil?: number;
  answer?: string;
  status: QuestionStatus;
  answered: boolean;
}

interface LearningSessionContextType {
  // Session state
  activeSession: Session | null;
  currentQuestion: Question | null;
  sessionQuestions: SessionQuestion[]; // Single source of truth
  currentTeil: number;
  questionProgress: {
    current: number;
    total: number;
    answered: number;
    unanswered: number;
    percentage: number;
  };
  
  // Loading/error states
  isLoading: boolean;
  error: string | null;
  stats: SessionStats | null;
  
  // Session actions
  startSession: (type: SessionTypeEnum, metadata?: Record<string, any>) => Promise<Session | null>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  endSession: (status?: 'completed' | 'abandoned') => Promise<void>;
  
  // Question actions
  submitAnswer: (answer: string | string[] | boolean, timeSpent?: number) => Promise<QuestionResult | null>;
  nextQuestion: () => void;
  previousQuestion: () => void;
  completeQuestions: () => Promise<any>;

  // Teil navigation
  navigateToTeil: (teilNumber: number) => void;
  submitTeilAnswers: (answers: Record<string, string>) => void;
  updateQuestionStatus: (questionId: string, status: QuestionStatus) => void;
  addQuestion: (question: Question) => void;

  // Session data getters (all derived from sessionQuestions)
  getSupportedQuestionTypes: () => QuestionTypeName[];
  getQuestionResults: () => QuestionResult[];
  
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
  
  // Core state - SIMPLIFIED to single source of truth
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestion[]>([]); // Single source of truth
  const [currentTeil, setCurrentTeil] = useState(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [questionProgress, setQuestionProgress] = useState({
    current: 0,
    total: 0,
    answered: 0,
    unanswered: 0,
    percentage: 0
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);

  // Load user stats on mount
  useEffect(() => {
    if (authSession?.user?.email) {
      refreshStats();
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
          const session = sessions[0];
          setActiveSession(session);

          // Load questions for the session
          const questionsRes = await fetch(`/api/sessions/${session.id}/questions`);
          if (questionsRes.ok) {
            const questions: Question[] = await questionsRes.json();
            // Convert to SessionQuestion format
            const sessionQs: SessionQuestion[] = questions.map(q => ({
              ...q,
              status: QuestionStatus.LOADED,
              answered: false
            }));
            setSessionQuestions(sessionQs);
            if (sessionQs.length > 0) {
              setCurrentQuestion(sessionQs[0]);
              updateProgress(0, sessionQs.length, 0);
            }
          }
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
    type: SessionTypeEnum, 
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

      // Load questions
      const questionsRes = await fetch(`/api/sessions/${session.id}/questions`);
      if (questionsRes.ok) {
        const questions: Question[] = await questionsRes.json();
        // Convert to SessionQuestion format
        const sessionQs: SessionQuestion[] = questions.map(q => ({
          ...q,
          status: QuestionStatus.LOADED,
          answered: false
        }));
        setSessionQuestions(sessionQs);
        setCurrentQuestionIndex(0);
        setQuestionResults([]);

        if (sessionQs.length > 0) {
          setCurrentQuestion(sessionQs[0]);
          updateProgress(0, sessionQs.length, 0);
        }

        console.log('Session started:', {
          sessionId: session.id,
          type,
          totalQuestions: sessionQs.length,
          teils: [...new Set(sessionQs.map(q => (q as any).teil || 1))]
        });
      }
      
      return session;
    } catch (err) {
      console.error('Failed to start session:', err);
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
        setCurrentQuestion(null);
        setSessionQuestions([]);
        setCurrentTeil(1);
        setCurrentQuestionIndex(0);
        setQuestionResults([]);
        setQuestionProgress({
          current: 0,
          total: 0,
          answered: 0,
          unanswered: 0,
          percentage: 0
        });
        await refreshStats();
      }
    } catch (err) {
      setError('Failed to end session');
    } finally {
      setIsLoading(false);
    }
  }, [activeSession, refreshStats]);

  const updateProgress = (currentIndex: number, total: number, answered: number) => {
    setQuestionProgress({
      current: currentIndex + 1,
      total,
      answered,
      unanswered: total - answered,
      percentage: total > 0 ? (answered / total) * 100 : 0
    });
  };

  const submitAnswer = useCallback(async (
    answer: string | string[] | boolean,
    timeSpent: number = 0
  ): Promise<QuestionResult | null> => {
    if (!activeSession || !currentQuestion) {
      setError('No active question to answer');
      return null;
    }

    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answer,
          timeSpent,
          hintsUsed: 0
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const result = await response.json();
      
      // Update results
      setQuestionResults(prev => [...prev, result]);
      
      // Update progress
      const answered = questionResults.length + 1;
      updateProgress(currentQuestionIndex, sessionQuestions.length, answered);

      return result;
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('Failed to submit answer');
      return null;
    }
  }, [activeSession, currentQuestion, currentQuestionIndex, sessionQuestions.length, questionResults.length]);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < sessionQuestions.length - 1) {
      const newIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newIndex);
      setCurrentQuestion(sessionQuestions[newIndex]);
      updateProgress(newIndex, sessionQuestions.length, questionResults.length);
    }
  }, [currentQuestionIndex, sessionQuestions, questionResults.length]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(newIndex);
      setCurrentQuestion(sessionQuestions[newIndex]);
      updateProgress(newIndex, sessionQuestions.length, questionResults.length);
    }
  }, [currentQuestionIndex, sessionQuestions, questionResults.length]);

  const completeQuestions = useCallback(async () => {
    if (!activeSession) return null;
    
    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/complete`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete session');
      }
      
      const results = await response.json();
      await endSession('completed');
      return results;
    } catch (err) {
      console.error('Failed to complete questions:', err);
      setError('Failed to complete session');
      return null;
    }
  }, [activeSession, endSession]);

  // Getters - SIMPLIFIED (derived from sessionQuestions)
  const getSupportedQuestionTypes = useCallback((): QuestionTypeName[] => {
    if (!activeSession) return [];
    // This would need to be fetched from the server or stored in session metadata
    return [];
  }, [activeSession]);

  const getQuestionResults = useCallback((): QuestionResult[] => {
    return questionResults;
  }, [questionResults]);

  // Teil-based session methods - SIMPLIFIED (derived from sessionQuestions)
  const navigateToTeil = useCallback((teilNumber: number) => {
    const teilQuestions = sessionQuestions.filter(q => (q.teil || 1) === teilNumber);
    if (teilQuestions.length > 0 && teilQuestions.some(q => q.status === QuestionStatus.LOADED)) {
      setCurrentTeil(teilNumber);
    }
  }, [sessionQuestions]);

  const submitTeilAnswers = useCallback((answers: Record<string, string>) => {
    setSessionQuestions(prev =>
      prev.map(q => {
        if (answers[q.id]) {
          return { ...q, answer: answers[q.id], answered: true };
        }
        return q;
      })
    );
  }, []);

  const updateQuestionStatus = useCallback((questionId: string, status: QuestionStatus) => {
    setSessionQuestions(prev =>
      prev.map(q => q.id === questionId ? { ...q, status } : q)
    );
  }, []);

  const addQuestion = useCallback((question: Question) => {
    const sessionQ: SessionQuestion = {
      ...question,
      status: QuestionStatus.LOADED,
      answered: false
    };
    setSessionQuestions(prev => [...prev, sessionQ]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <LearningSessionContext.Provider
      value={{
        activeSession,
        currentQuestion,
        sessionQuestions,
        currentTeil,
        questionProgress,
        isLoading,
        error,
        stats,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        submitAnswer,
        nextQuestion,
        previousQuestion,
        completeQuestions,
        navigateToTeil,
        submitTeilAnswers,
        updateQuestionStatus,
        addQuestion,
        getSupportedQuestionTypes,
        getQuestionResults,
        refreshStats,
        clearError
      }}
    >
      {children}
    </LearningSessionContext.Provider>
  );
}