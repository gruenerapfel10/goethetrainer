'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useSession } from 'next-auth/react';
import type { Session, SessionStats } from './types';
import type { Question, QuestionResult, UserAnswer } from './questions/question-types';
import type { QuestionTypeName } from './questions/question-registry';

export enum QuestionStatus {
  GENERATING = 'generating',
  LOADED = 'loaded',
  ERROR = 'error',
}

export interface SessionQuestion extends Question {
  status: QuestionStatus;
  answered: boolean;
  result?: QuestionResult;
}

interface LearningSessionContextType {
  activeSession: Session | null;
  sessionQuestions: SessionQuestion[];
  currentQuestion: SessionQuestion | null;
  currentQuestionIndex: number;
  currentTeil: number;
  totalTeils: number;
  questionProgress: {
    current: number;
    total: number;
  };
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  stats: SessionStats | null;
  startSession: (type: string, metadata?: Record<string, any>) => Promise<Session | null>;
  endSession: (status?: 'completed' | 'abandoned') => Promise<void>;
  submitAnswer: (
    questionId: string,
    answer: string | string[] | boolean,
    timeSpent?: number,
    hintsUsed?: number
  ) => Promise<QuestionResult | null>;
  submitTeilAnswers: (
    answers: Record<string, string | string[] | boolean>
  ) => Promise<QuestionResult[]>;
  nextQuestion: () => void;
  previousQuestion: () => void;
  setQuestionIndex: (index: number) => void;
  navigateToTeil: (teilNumber: number) => void;
  completeQuestions: () => Promise<any>;
  getQuestionResults: () => QuestionResult[];
  getSupportedQuestionTypes: () => QuestionTypeName[];
  refreshStats: () => Promise<void>;
  clearError: () => void;
}

const LearningSessionContext = createContext<LearningSessionContextType | null>(null);

function useLearningSessionContext(): LearningSessionContextType {
  const context = useContext(LearningSessionContext);
  if (!context) {
    throw new Error('useLearningSession must be used within LearningSessionProvider');
  }
  return context;
}

function buildSessionQuestions(
  questions: Question[],
  answers: UserAnswer[] = [],
  results: QuestionResult[] = []
): SessionQuestion[] {
  const answerMap = new Map(answers.map(answer => [answer.questionId, answer.answer]));
  const resultMap = new Map(results.map(result => [result.questionId, result]));

  return questions.map(question => ({
    ...question,
    status: QuestionStatus.LOADED,
    answered: resultMap.has(question.id) || question.answered || false,
    answer: answerMap.get(question.id) ?? question.answer,
    result: resultMap.get(question.id),
  }));
}

function getInitialTeil(questions: SessionQuestion[]): number {
  if (questions.length === 0) {
    return 1;
  }
  return questions[0].teil ?? 1;
}

function getTeilCount(questions: SessionQuestion[]): number {
  if (questions.length === 0) {
    return 1;
  }
  const teils = new Set(questions.map(q => q.teil ?? 1));
  return teils.size || 1;
}

export function LearningSessionProvider({ children }: { children: React.ReactNode }) {
  const { data: authSession } = useSession();

  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestion[]>([]);
  const [questionResults, setQuestionResults] = useState<Record<string, QuestionResult>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentTeil, setCurrentTeil] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);

  const resetState = useCallback(() => {
    setActiveSession(null);
    setSessionQuestions([]);
    setQuestionResults({});
    setCurrentQuestionIndex(0);
    setCurrentTeil(1);
    setError(null);
  }, []);

  const currentQuestion = useMemo(
    () => sessionQuestions[currentQuestionIndex] ?? null,
    [sessionQuestions, currentQuestionIndex]
  );

  const questionProgress = useMemo(
    () => ({
      current: sessionQuestions.length === 0 ? 0 : currentQuestionIndex + 1,
      total: sessionQuestions.length,
    }),
    [sessionQuestions, currentQuestionIndex]
  );

  const totalTeils = useMemo(
    () => getTeilCount(sessionQuestions),
    [sessionQuestions]
  );

  const refreshStats = useCallback(async () => {
    if (!authSession?.user?.email) return;

    try {
      const response = await fetch('/api/sessions/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (fetchError) {
      console.error('Error fetching stats:', fetchError);
    }
  }, [authSession?.user?.email]);

  const loadQuestions = useCallback(
    async (sessionId: string, sessionSnapshot?: Session | null) => {
      try {
        const [questionsResponse, sessionResponse] = await Promise.all([
          fetch(`/api/sessions/${sessionId}/questions`),
          sessionSnapshot ? Promise.resolve({ ok: true, json: async () => sessionSnapshot }) : fetch(`/api/sessions/${sessionId}`),
        ]);

        if (!questionsResponse.ok) {
          throw new Error('Failed to load questions');
        }

        const questions: Question[] = await questionsResponse.json();
        let sessionData: Session | null = null;

        if (sessionResponse.ok) {
          sessionData = await sessionResponse.json();
        }

        const answers = sessionData?.data?.answers ?? [];
        const results = sessionData?.data?.results ?? [];

        const hydratedQuestions = buildSessionQuestions(questions, answers, results);

        setSessionQuestions(hydratedQuestions);
        setQuestionResults(
          Object.fromEntries(results.map((result: QuestionResult) => [result.questionId, result]))
        );
        setCurrentQuestionIndex(0);
        setCurrentTeil(getInitialTeil(hydratedQuestions));
      } catch (loadError) {
        console.error('Failed to load session questions:', loadError);
        setError('Failed to load session questions');
      }
    },
    []
  );

  const checkActiveSession = useCallback(async () => {
    if (!authSession?.user?.email) {
      resetState();
      return;
    }

    try {
      const response = await fetch('/api/sessions/active');
      if (!response.ok) {
        return;
      }

      const sessions: Session[] = await response.json();
      if (sessions.length === 0) {
        resetState();
        return;
      }

      const currentSession = sessions[0];
      setActiveSession(currentSession);
      await loadQuestions(currentSession.id, currentSession);
    } catch (activeError) {
      console.error('Error checking active session:', activeError);
    }
  }, [authSession?.user?.email, loadQuestions, resetState]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      if (!authSession?.user?.email) {
        resetState();
        return;
      }
      setIsLoading(true);
      try {
        await Promise.all([checkActiveSession(), refreshStats()]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [authSession?.user?.email, checkActiveSession, refreshStats, resetState]);

  const startSession = useCallback(async (
    type: string,
    metadata?: Record<string, any>
  ): Promise<Session | null> => {
    if (!authSession?.user?.email) {
      setError('You must be logged in to start a session');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (activeSession) {
        await fetch(`/api/sessions/${activeSession.id}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'abandoned' }),
        });
      }

      const createResponse = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, metadata }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to start session');
      }

      const session = await createResponse.json();

      const generateResponse = await fetch(`/api/sessions/${session.id}/generate`, {
        method: 'POST',
      });

      if (!generateResponse.ok) {
        throw new Error('Failed to generate questions');
      }

      const generated = await generateResponse.json();
      const questions: Question[] = generated.questions ?? [];

      const hydratedQuestions = buildSessionQuestions(questions);

      setActiveSession(session);
      setSessionQuestions(hydratedQuestions);
      setQuestionResults({});
      setCurrentQuestionIndex(0);
      setCurrentTeil(getInitialTeil(hydratedQuestions));

      await refreshStats();

      return session;
    } catch (startError) {
      console.error('Failed to start session:', startError);
      setError(startError instanceof Error ? startError.message : 'Failed to start session');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authSession?.user?.email, activeSession, refreshStats]);

  const endSession = useCallback(async (status: 'completed' | 'abandoned' = 'completed') => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to end session');
      }

      resetState();
      await refreshStats();
    } catch (endError) {
      console.error('Failed to end session:', endError);
      setError('Failed to end session');
    } finally {
      setIsLoading(false);
    }
  }, [activeSession, refreshStats, resetState]);

  const submitAnswer = useCallback(async (
    questionId: string,
    answer: string | string[] | boolean,
    timeSpent: number = 0,
    hintsUsed: number = 0
  ): Promise<QuestionResult | null> => {
    if (!activeSession) {
      setError('No active session');
      return null;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          answer,
          timeSpent,
          hintsUsed,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const result: QuestionResult = await response.json();

      setSessionQuestions(prev =>
        prev.map(question =>
          question.id === questionId
            ? {
                ...question,
                answered: true,
                answer,
                result,
              }
            : question
        )
      );

      setQuestionResults(prev => ({
        ...prev,
        [result.questionId]: result,
      }));

      return result;
    } catch (submitError) {
      console.error('Failed to submit answer:', submitError);
      setError('Failed to submit answer');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [activeSession]);

  const submitTeilAnswers = useCallback(async (
    answers: Record<string, string | string[] | boolean>
  ): Promise<QuestionResult[]> => {
    if (!activeSession) return [];

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit Teil answers');
      }

      const payload = await response.json();
      const results: QuestionResult[] = payload.results ?? [];

      setSessionQuestions(prev =>
        prev.map(question =>
          answers[question.id] !== undefined
            ? {
                ...question,
                answered: true,
                answer: answers[question.id],
                result: results.find(result => result.questionId === question.id) ?? question.result,
              }
            : question
        )
      );

      setQuestionResults(prev => {
        const next = { ...prev };
        results.forEach(result => {
          next[result.questionId] = result;
        });
        return next;
      });

      return results;
    } catch (teilError) {
      console.error('Failed to submit Teil answers:', teilError);
      setError('Failed to submit Teil answers');
      return [];
    } finally {
      setIsSubmitting(false);
    }
  }, [activeSession]);

  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex(prev => {
      const nextIndex = Math.min(prev + 1, sessionQuestions.length - 1);
      const nextQuestion = sessionQuestions[nextIndex];
      if (nextQuestion) {
        setCurrentTeil(nextQuestion.teil ?? currentTeil);
      }
      return nextIndex;
    });
  }, [sessionQuestions, currentTeil]);

  const previousQuestion = useCallback(() => {
    setCurrentQuestionIndex(prev => {
      const nextIndex = Math.max(prev - 1, 0);
      const nextQuestion = sessionQuestions[nextIndex];
      if (nextQuestion) {
        setCurrentTeil(nextQuestion.teil ?? currentTeil);
      }
      return nextIndex;
    });
  }, [sessionQuestions, currentTeil]);

  const setQuestionIndex = useCallback((index: number) => {
    setCurrentQuestionIndex(() => {
      const boundedIndex = Math.min(Math.max(index, 0), sessionQuestions.length - 1);
      const question = sessionQuestions[boundedIndex];
      if (question) {
        setCurrentTeil(question.teil ?? currentTeil);
      }
      return boundedIndex;
    });
  }, [sessionQuestions, currentTeil]);

  const navigateToTeil = useCallback((teilNumber: number) => {
    if (teilNumber < 1 || teilNumber > totalTeils) return;
    const targetIndex = sessionQuestions.findIndex(question => (question.teil ?? 1) === teilNumber);
    if (targetIndex >= 0) {
      setCurrentTeil(teilNumber);
      setCurrentQuestionIndex(targetIndex);
    }
  }, [sessionQuestions, totalTeils]);

  const completeQuestions = useCallback(async () => {
    if (!activeSession) return null;
    try {
      const response = await fetch(`/api/sessions/${activeSession.id}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to complete session');
      }

      const results = await response.json();
      await refreshStats();
      return results;
    } catch (completeError) {
      console.error('Failed to complete questions:', completeError);
      setError('Failed to complete session');
      return null;
    }
  }, [activeSession, refreshStats]);

  const getQuestionResults = useCallback(
    () => Object.values(questionResults),
    [questionResults]
  );

  const getSupportedQuestionTypes = useCallback((): QuestionTypeName[] => {
    const registryTypes = sessionQuestions
      .map(question => question.registryType)
      .filter((type): type is QuestionTypeName => Boolean(type));
    return Array.from(new Set(registryTypes));
  }, [sessionQuestions]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue = useMemo<LearningSessionContextType>(() => ({
    activeSession,
    sessionQuestions,
    currentQuestion,
    currentQuestionIndex,
    currentTeil,
    totalTeils,
    questionProgress,
    isLoading,
    isSubmitting,
    error,
    stats,
    startSession,
    endSession,
    submitAnswer,
    submitTeilAnswers,
    nextQuestion,
    previousQuestion,
    setQuestionIndex,
    navigateToTeil,
    completeQuestions,
    getQuestionResults,
    getSupportedQuestionTypes,
    refreshStats,
    clearError,
  }), [
    activeSession,
    sessionQuestions,
    currentQuestion,
    currentQuestionIndex,
    currentTeil,
    totalTeils,
    questionProgress,
    isLoading,
    isSubmitting,
    error,
    stats,
    startSession,
    endSession,
    submitAnswer,
    submitTeilAnswers,
    nextQuestion,
    previousQuestion,
    setQuestionIndex,
    navigateToTeil,
    completeQuestions,
    getQuestionResults,
    getSupportedQuestionTypes,
    refreshStats,
    clearError,
  ]);

  return (
    <LearningSessionContext.Provider value={contextValue}>
      {children}
    </LearningSessionContext.Provider>
  );
}

export function useLearningSession(): LearningSessionContextType {
  return useLearningSessionContext();
}
