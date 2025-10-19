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

interface LearningSessionContextType {
  // Session state
  activeSession: Session | null;
  currentQuestion: Question | null;
  allQuestions: Question[];
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
  
  // Session data getters
  getSupportedQuestionTypes: () => QuestionTypeName[];
  getAllQuestions: () => Question[];
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
  
  // Core state
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
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
            const questions = await questionsRes.json();
            setAllQuestions(questions);
            if (questions.length > 0) {
              setCurrentQuestion(questions[0]);
              updateProgress(0, questions.length, 0);
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
        const questions = await questionsRes.json();
        setAllQuestions(questions);
        setCurrentQuestionIndex(0);
        setQuestionResults([]);
        
        if (questions.length > 0) {
          setCurrentQuestion(questions[0]);
          updateProgress(0, questions.length, 0);
        }
        
        console.log('Session started:', {
          sessionId: session.id,
          type,
          totalQuestions: questions.length
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
        setAllQuestions([]);
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
      updateProgress(currentQuestionIndex, allQuestions.length, answered);
      
      return result;
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('Failed to submit answer');
      return null;
    }
  }, [activeSession, currentQuestion, currentQuestionIndex, allQuestions.length, questionResults.length]);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      const newIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newIndex);
      setCurrentQuestion(allQuestions[newIndex]);
      updateProgress(newIndex, allQuestions.length, questionResults.length);
    }
  }, [currentQuestionIndex, allQuestions, questionResults.length]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(newIndex);
      setCurrentQuestion(allQuestions[newIndex]);
      updateProgress(newIndex, allQuestions.length, questionResults.length);
    }
  }, [currentQuestionIndex, allQuestions, questionResults.length]);

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

  // Getters
  const getSupportedQuestionTypes = useCallback((): QuestionTypeName[] => {
    if (!activeSession) return [];
    // This would need to be fetched from the server or stored in session metadata
    return [];
  }, [activeSession]);

  const getAllQuestions = useCallback((): Question[] => {
    return allQuestions;
  }, [allQuestions]);

  const getQuestionResults = useCallback((): QuestionResult[] => {
    return questionResults;
  }, [questionResults]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <LearningSessionContext.Provider
      value={{
        activeSession,
        currentQuestion,
        allQuestions,
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
        getSupportedQuestionTypes,
        getAllQuestions,
        getQuestionResults,
        refreshStats,
        clearError
      }}
    >
      {children}
    </LearningSessionContext.Provider>
  );
}