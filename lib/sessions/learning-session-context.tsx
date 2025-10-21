/* eslint-disable @typescript-eslint/no-use-before-define */
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  Session,
  SessionStats,
  SessionType,
  UpdateSessionInput,
} from './types';
import type {
  Question,
  QuestionResult,
  UserAnswer,
} from './questions/question-types';
import { QuestionTypeName } from './questions/question-registry';
import { SessionTypeEnum } from './session-registry';

export enum QuestionStatus {
  GENERATING = 'generating',
  LOADED = 'loaded',
  ERROR = 'error',
}

type TeilState = 'pending' | 'active' | 'completed';

export interface SessionQuestion extends Question {
  answer?: string | string[] | boolean;
  answered: boolean;
  result?: QuestionResult;
  isCurrent: boolean;
  teilState: TeilState;
  status: QuestionStatus;
}

export interface CompletionSummary {
  results: QuestionResult[];
  summary: {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    totalScore: number;
    maxScore: number;
    percentage: number;
    pendingManualReview: number;
  };
}

interface QuestionProgress {
  current: number;
  total: number;
  answered: number;
  completedTeilCount: number;
}

interface LearningSessionContextType {
  activeSession: Session | null;
  sessionQuestions: SessionQuestion[];
  currentQuestion: SessionQuestion | null;
  questionProgress: QuestionProgress;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  stats: SessionStats | null;
  activeView: 'fragen' | 'quelle';
  latestResults: CompletionSummary | null;
  startSession: (
    type: SessionType | SessionTypeEnum,
    metadata?: Record<string, any>
  ) => Promise<Session | null>;
  initializeSession: (sessionId: string) => Promise<Session | null>;
  endSession: (status?: 'completed' | 'abandoned') => Promise<void>;
  submitAnswer: (
    questionId: string,
    answer: string | string[] | boolean,
    timeSpent?: number,
    hintsUsed?: number
  ) => Promise<QuestionResult | null>;
  submitTeilAnswers: (
    answers: Record<string, string | string[] | boolean>,
    teilNumber: number
  ) => Promise<void>;
  activateTeil: (teilNumber: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  setActiveView: (view: 'fragen' | 'quelle') => void;
  setQuestionAnswer: (questionId: string, answer: string | string[] | boolean) => void;
  completeQuestions: () => Promise<CompletionSummary | null>;
  refreshStats: () => Promise<void>;
  clearError: () => void;
  clearResults: () => void;
  getQuestionResults: () => QuestionResult[];
  getSupportedQuestionTypes: () => QuestionTypeName[];
}

const LearningSessionContext = createContext<LearningSessionContextType | null>(null);

export function LearningSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestion[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [activeView, setActiveViewState] = useState<'fragen' | 'quelle'>('fragen');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [latestResults, setLatestResults] = useState<CompletionSummary | null>(null);

  const activeSessionRef = useRef<Session | null>(null);
const sessionQuestionsRef = useRef<SessionQuestion[]>([]);
const answersRef = useRef<Map<string, UserAnswer>>(new Map());
const resultsRef = useRef<Map<string, QuestionResult>>(new Map());
const sessionVersionRef = useRef<number>(0);
const sessionHydratedRef = useRef<boolean>(false);
const dirtyRef = useRef<boolean>(false);
const autoFlushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    sessionQuestionsRef.current = sessionQuestions;
  }, [sessionQuestions]);

  const currentQuestion = useMemo(
    () => sessionQuestions.find(question => question.isCurrent) ?? null,
    [sessionQuestions]
  );

  const questionProgress = useMemo<QuestionProgress>(() => {
    const total = sessionQuestions.length;
    const answered = sessionQuestions.filter(question => question.answered).length;
    const currentIndex = sessionQuestions.findIndex(question => question.isCurrent);
    const completedTeils = new Set(
      sessionQuestions
        .filter(question => question.teilState === 'completed')
        .map(question => normaliseTeil(question.teil))
    );

    return {
      current: currentIndex >= 0 ? currentIndex + 1 : 0,
      total,
      answered,
      completedTeilCount: completedTeils.size,
    };
  }, [sessionQuestions]);

  const applySessionDoc = useCallback(
    (session: Session, preferredQuestionId?: string | null) => {
      const rawQuestions = Array.isArray(session.data?.questions)
        ? (session.data?.questions as Question[])
        : [];
      const rawAnswers = normalizeAnswers(session.data?.answers ?? []);
      const rawResults = normalizeResults(session.data?.results ?? []);

      answersRef.current = new Map(rawAnswers.map(answer => [answer.questionId, answer]));
      resultsRef.current = new Map(rawResults.map(result => [result.questionId, result]));

      const { questions, activeQuestionId: derivedActiveId } = deriveSessionView(
        rawQuestions,
        rawAnswers,
        rawResults,
        preferredQuestionId ??
          session.metadata?.uiState?.activeQuestionId ??
          session.metadata?.uiState?.lastViewedQuestionId ??
          null
      );

      sessionVersionRef.current = session.metadata?.uiState?.currentVersion ?? 0;
      sessionHydratedRef.current = true;
      dirtyRef.current = false;
      if (autoFlushTimeoutRef.current) {
        clearTimeout(autoFlushTimeoutRef.current);
        autoFlushTimeoutRef.current = null;
      }

      setActiveSession(session);
      setSessionQuestions(questions);
      setActiveQuestionId(derivedActiveId);
      setActiveViewState(detectActiveView(session.metadata?.uiState));
    },
    []
  );

  const fetchAndApplySession = useCallback(
    async (sessionId: string, preferredQuestionId?: string | null) => {
      const session = await requestJson<Session>(
        `/api/sessions/${sessionId}`,
        { cache: 'no-store' }
      );

      const firstQuestionId =
        session.data?.questions && Array.isArray(session.data.questions)
          ? (session.data.questions[0] as Question | undefined)?.id ?? null
          : null;

      const preferred =
        preferredQuestionId ??
        session.metadata?.uiState?.activeQuestionId ??
        session.metadata?.uiState?.lastViewedQuestionId ??
        sessionQuestionsRef.current[0]?.id ??
        firstQuestionId;

      applySessionDoc(session, preferred);
      return session;
    },
    [applySessionDoc]
  );

  const sendSessionUpdate = useCallback(
    async (
      update: UpdateSessionInput,
      options: { transport?: 'fetch' | 'beacon'; preferredQuestionId?: string | null } = {}
    ): Promise<Session | null> => {
      const session = activeSessionRef.current;
      if (!session) {
        return null;
      }

      if (!sessionHydratedRef.current) {
        return null;
      }

      const questionsSnapshot = sessionQuestionsRef.current;
      const targetQuestionId =
        options.preferredQuestionId ??
        update.metadata?.uiState?.activeQuestionId ??
        activeQuestionId ??
        questionsSnapshot[0]?.id ??
        null;
      const viewOverride = update.metadata?.uiState?.activeView ?? activeView;
      const nextVersion = sessionVersionRef.current + 1;
      const uiState = {
        ...buildUiState(questionsSnapshot, targetQuestionId, viewOverride, nextVersion),
        ...(update.metadata?.uiState ?? {}),
        currentVersion: nextVersion,
      };

      const payload: UpdateSessionInput = {
        ...update,
        data: update.data ?? {},
        metadata: {
          ...(update.metadata ?? {}),
          uiState,
        },
      };

      const body = JSON.stringify(payload);
      const endpoint = `/api/sessions/${session.id}/update`;

      if (options.transport === 'beacon' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const success = navigator.sendBeacon(
          endpoint,
          new Blob([body], { type: 'application/json' })
        );
        if (success) {
          sessionVersionRef.current = nextVersion;
          dirtyRef.current = false;
        }
        return null;
      }

      const updatedSession = await requestJson<Session>(endpoint, {
        method: 'POST',
        body,
      });

      sessionVersionRef.current =
        updatedSession.metadata?.uiState?.currentVersion ?? nextVersion;
      applySessionDoc(updatedSession, targetQuestionId);
      dirtyRef.current = false;
      return updatedSession;
    },
    [activeQuestionId, activeView, applySessionDoc]
  );

  const flushPendingSession = useCallback(
    async (transport: 'fetch' | 'beacon' = 'fetch') => {
      if (!sessionHydratedRef.current || !dirtyRef.current || !activeSessionRef.current) {
        return null;
      }

      if (autoFlushTimeoutRef.current) {
        clearTimeout(autoFlushTimeoutRef.current);
        autoFlushTimeoutRef.current = null;
      }

      const questionsSnapshot = sessionQuestionsRef.current;
      if (questionsSnapshot.length === 0) {
        return null;
      }

      const answersPayload = buildAnswerPayload(questionsSnapshot, answersRef.current);

      return sendSessionUpdate(
        {
          data: { answers: answersPayload },
          metadata: { uiState: { activeQuestionId, activeView } },
        },
        { transport, preferredQuestionId: activeQuestionId }
      );
    },
    [activeQuestionId, activeView, sendSessionUpdate]
  );

  const scheduleFlush = useCallback(
    (delay = 500) => {
      if (!sessionHydratedRef.current) {
        return;
      }

      if (autoFlushTimeoutRef.current) {
        clearTimeout(autoFlushTimeoutRef.current);
      }

      autoFlushTimeoutRef.current = setTimeout(() => {
        autoFlushTimeoutRef.current = null;
        void flushPendingSession('fetch');
      }, delay);
    },
    [flushPendingSession]
  );

  const refreshStats = useCallback(async () => {
    try {
      const data = await requestJson<SessionStats>('/api/sessions/stats', {
        cache: 'no-store',
      });
      setStats(data);
    } catch (err) {
      console.error('Failed to refresh stats', err);
    }
  }, []);

  const resetState = useCallback(() => {
    if (autoFlushTimeoutRef.current) {
      clearTimeout(autoFlushTimeoutRef.current);
      autoFlushTimeoutRef.current = null;
    }
    setActiveSession(null);
    setSessionQuestions([]);
    setActiveQuestionId(null);
    setLatestResults(null);
    answersRef.current = new Map();
    resultsRef.current = new Map();
    sessionQuestionsRef.current = [];
    sessionVersionRef.current = 0;
    sessionHydratedRef.current = false;
    dirtyRef.current = false;
  }, []);

  const initializeSession = useCallback(
    async (sessionId: string): Promise<Session | null> => {
      setIsLoading(true);
      setError(null);
      setLatestResults(null);

      try {
        const session = await fetchAndApplySession(sessionId);
        await refreshStats();
        return session;
      } catch (err) {
        console.error('Failed to initialize session', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAndApplySession, refreshStats]
  );

  const startSession = useCallback(
    async (type: SessionType | SessionTypeEnum, metadata?: Record<string, any>) => {
      setIsLoading(true);
      setError(null);
      setLatestResults(null);

      try {
        if (activeSessionRef.current) {
          await requestJson(`/api/sessions/${activeSessionRef.current.id}/end`, {
            method: 'POST',
            body: JSON.stringify({ status: 'abandoned' }),
          });
        }

        resetState();

        const session = await requestJson<Session>('/api/sessions/start', {
          method: 'POST',
          body: JSON.stringify({ type, metadata }),
        });

        await requestJson(`/api/sessions/${session.id}/generate`, { method: 'POST' });
        await fetchAndApplySession(session.id);
        await refreshStats();
        return session;
      } catch (err) {
        console.error('Failed to start session', err);
        setError(err instanceof Error ? err.message : 'Failed to start session');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAndApplySession, refreshStats, resetState]
  );

  const endSession = useCallback(
    async (status: 'completed' | 'abandoned' = 'completed') => {
      if (!activeSessionRef.current) {
        return;
      }

    setIsLoading(true);
    setError(null);

    try {
      await flushPendingSession('fetch');
      await requestJson(`/api/sessions/${activeSessionRef.current.id}/end`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      resetState();
        await refreshStats();
      } catch (err) {
        console.error('Failed to end session', err);
        setError(err instanceof Error ? err.message : 'Failed to end session');
      } finally {
        setIsLoading(false);
      }
    },
    [flushPendingSession, refreshStats, resetState]
  );

  const submitAnswer = useCallback(
    async (
      questionId: string,
      answer: string | string[] | boolean,
      timeSpent: number = 0,
      hintsUsed: number = 0
    ): Promise<QuestionResult | null> => {
      if (!activeSessionRef.current) {
        setError('No active session');
        return null;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const result = await requestJson<QuestionResult>(
          `/api/sessions/${activeSessionRef.current.id}/answer`,
          {
            method: 'POST',
            body: JSON.stringify({ questionId, answer, timeSpent, hintsUsed }),
          }
        );

        await fetchAndApplySession(activeSessionRef.current.id, questionId);
        return result;
      } catch (err) {
        console.error('Failed to submit answer', err);
        setError(err instanceof Error ? err.message : 'Failed to submit answer');
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchAndApplySession]
  );

  const setQuestionAnswer = useCallback(
    (questionId: string, answer: string | string[] | boolean) => {
      if (!activeSessionRef.current || !sessionHydratedRef.current) {
        return;
      }

      const previousQuestions = sessionQuestionsRef.current;
      const targetQuestion = previousQuestions.find(question => question.id === questionId);
      if (targetQuestion && answersEqual(targetQuestion.answer, answer)) {
        return;
      }
      const updated = previousQuestions.map(question =>
        question.id === questionId
          ? { ...question, answer, answered: true }
          : question
      );
      const { questions } = updateQuestionsFocus(
        updated,
        activeQuestionId ?? questionId
      );

      sessionQuestionsRef.current = questions;
    setSessionQuestions(questions);
    setActiveQuestionId(activeQuestionId ?? questionId);

    const existing = answersRef.current.get(questionId);
    answersRef.current.set(questionId, {
        questionId,
        answer,
        attempts: existing?.attempts ?? 1,
        hintsUsed: existing?.hintsUsed ?? 0,
        timeSpent: existing?.timeSpent ?? 0,
      timestamp: new Date(),
    });
    dirtyRef.current = true;
    scheduleFlush();
  },
    [activeQuestionId, scheduleFlush]
  );

  const submitTeilAnswers = useCallback(
    async (
      answers: Record<string, string | string[] | boolean>,
      _teilNumber: number
    ) => {
      if (!activeSessionRef.current) {
        setError('No active session');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const previousQuestions = sessionQuestionsRef.current;
        const updated = previousQuestions.map(question => {
          if (answers[question.id] !== undefined) {
            return { ...question, answer: answers[question.id], answered: true };
          }
          return question;
        });

        const { questions } = updateQuestionsFocus(updated, activeQuestionId);
        sessionQuestionsRef.current = questions;
        setSessionQuestions(questions);

        Object.entries(answers).forEach(([questionId, value]) => {
          answersRef.current.set(questionId, {
            questionId,
            answer: value,
            attempts: 1,
            hintsUsed: 0,
            timeSpent: 0,
            timestamp: new Date(),
          });
        });

        dirtyRef.current = true;
        scheduleFlush();
      } catch (err) {
        console.error('Failed to submit Teil answers', err);
        setError(err instanceof Error ? err.message : 'Failed to submit answers');
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeQuestionId, scheduleFlush]
  );

  const moveToQuestion = useCallback(
    (questionId: string | null) => {
      if (!questionId || !sessionHydratedRef.current) {
        return;
      }

      const previousQuestions = sessionQuestionsRef.current;
      const { questions } = updateQuestionsFocus(previousQuestions, questionId);

      sessionQuestionsRef.current = questions;
      setSessionQuestions(questions);
      setActiveQuestionId(questionId);
      dirtyRef.current = true;
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const activateTeil = useCallback(
    (teilNumber: number) => {
      const target = sessionQuestionsRef.current.find(
        question => normaliseTeil(question.teil) === teilNumber
      );
      if (target) {
        moveToQuestion(target.id);
      }
    },
    [moveToQuestion]
  );

  const nextQuestion = useCallback(() => {
    const questions = sessionQuestionsRef.current;
    if (!questions.length) {
      return;
    }

    const currentIndex = questions.findIndex(question => question.isCurrent);
    const target =
      currentIndex >= 0 && currentIndex < questions.length - 1
        ? questions[currentIndex + 1]
        : questions[Math.max(currentIndex, 0)];

    moveToQuestion(target?.id ?? null);
  }, [moveToQuestion]);

  const previousQuestion = useCallback(() => {
    const questions = sessionQuestionsRef.current;
    if (!questions.length) {
      return;
    }

    const currentIndex = questions.findIndex(question => question.isCurrent);
    const target =
      currentIndex > 0 ? questions[currentIndex - 1] : questions[Math.max(currentIndex, 0)];

    moveToQuestion(target?.id ?? null);
  }, [moveToQuestion]);

  const setActiveView = useCallback(
    (view: 'fragen' | 'quelle') => {
      if (view === activeView) {
        return;
      }
      setActiveViewState(view);
      if (!sessionHydratedRef.current) {
        return;
      }
      dirtyRef.current = true;
      scheduleFlush();
    },
    [activeView, scheduleFlush]
  );

  const completeQuestions = useCallback(async (): Promise<CompletionSummary | null> => {
    if (!activeSessionRef.current) {
      setError('No active session');
      return null;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await flushPendingSession('fetch');

      const results = await requestJson<CompletionSummary>(
        `/api/sessions/${activeSessionRef.current.id}/complete`,
        { method: 'POST' }
      );

      setLatestResults(results);
      await fetchAndApplySession(activeSessionRef.current.id);
      await refreshStats();
      return results;
    } catch (err) {
      console.error('Failed to complete session', err);
      setError(err instanceof Error ? err.message : 'Failed to complete session');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchAndApplySession, flushPendingSession, refreshStats]);

  const getQuestionResults = useCallback(
    () => sessionQuestions.map(question => question.result).filter(Boolean) as QuestionResult[],
    [sessionQuestions]
  );

  const getSupportedQuestionTypes = useCallback((): QuestionTypeName[] => {
    return Array.from(
      new Set(
        sessionQuestions
          .map(question => question.registryType)
          .filter((type): type is QuestionTypeName => typeof type === 'string')
      )
    );
  }, [sessionQuestions]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResults = useCallback(() => {
    setLatestResults(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushPendingSession('beacon');
      }
    };

    const handlePageHide = () => {
      void flushPendingSession('beacon');
    };

    const handleBeforeUnload = () => {
      void flushPendingSession('beacon');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushPendingSession]);

  useEffect(() => {
    return () => {
      if (autoFlushTimeoutRef.current) {
        clearTimeout(autoFlushTimeoutRef.current);
        autoFlushTimeoutRef.current = null;
      }
      void flushPendingSession('beacon');
    };
  }, [flushPendingSession]);

  const value = useMemo<LearningSessionContextType>(
    () => ({
      activeSession,
      sessionQuestions,
      currentQuestion,
      questionProgress,
      isLoading,
      isSubmitting,
      error,
      stats,
      activeView,
      latestResults,
      startSession,
      initializeSession,
      endSession,
      submitAnswer,
      submitTeilAnswers,
      activateTeil,
      nextQuestion,
      previousQuestion,
      setActiveView,
      setQuestionAnswer,
      completeQuestions,
      refreshStats,
      clearError,
      clearResults,
      getQuestionResults,
      getSupportedQuestionTypes,
    }),
    [
      activeSession,
      activeView,
      clearError,
      clearResults,
      completeQuestions,
      currentQuestion,
      endSession,
      error,
      getQuestionResults,
      getSupportedQuestionTypes,
      initializeSession,
      isLoading,
      isSubmitting,
      latestResults,
      nextQuestion,
      previousQuestion,
      questionProgress,
      refreshStats,
      setActiveView,
      setQuestionAnswer,
      startSession,
      stats,
      submitAnswer,
      submitTeilAnswers,
      activateTeil,
    ]
  );

  return (
    <LearningSessionContext.Provider value={value}>
      {children}
    </LearningSessionContext.Provider>
  );
}

export function useLearningSession(): LearningSessionContextType {
  const context = useContext(LearningSessionContext);
  if (!context) {
    throw new Error('useLearningSession must be used within LearningSessionProvider');
  }
  return context;
}

function normalizeTimestamp(value: any): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      // fall through
    }
  }
  return new Date().toISOString();
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: init.cache ?? 'no-store',
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function normaliseTeil(value?: number | null): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 1;
  }
  return value;
}

function normalizeAnswers(answers: any[]): UserAnswer[] {
  return answers.map(answer => ({
    ...answer,
    timestamp:
      answer?.timestamp instanceof Date
        ? answer.timestamp
        : new Date(answer?.timestamp ?? Date.now()),
  }));
}

function normalizeResults(results: any[]): QuestionResult[] {
  return results.map(result => ({
    ...result,
    userAnswer: result.userAnswer
      ? {
          ...result.userAnswer,
          timestamp:
            result.userAnswer.timestamp instanceof Date
              ? result.userAnswer.timestamp
              : new Date(result.userAnswer.timestamp ?? Date.now()),
        }
      : undefined,
  }));
}

function deriveSessionView(
  questions: Question[],
  answers: UserAnswer[],
  results: QuestionResult[],
  preferredQuestionId: string | null
): { questions: SessionQuestion[]; activeQuestionId: string | null; activeTeil: number } {
  const answersMap = new Map(answers.map(answer => [answer.questionId, answer]));
  const resultsMap = new Map(results.map(result => [result.questionId, result]));

  const prepared = questions.map(question => {
    const answerEntry = answersMap.get(question.id);
    const resultEntry = resultsMap.get(question.id);
    const answered = Boolean(answerEntry || question.answered || resultEntry);

    return {
      ...question,
      answer: answerEntry?.answer ?? question.answer,
      answered,
      result: resultEntry ?? question.result,
      isCurrent: false,
      teilState: 'pending' as TeilState,
      status: QuestionStatus.LOADED,
    };
  }) as SessionQuestion[];

  let activeId = preferredQuestionId;
  if (!activeId || !prepared.some(question => question.id === activeId)) {
    const firstUnanswered = prepared.find(question => !question.answered);
    activeId = firstUnanswered?.id ?? prepared[0]?.id ?? null;
  }

  const { questions: focussed, activeTeil } = updateQuestionsFocus(prepared, activeId);
  return {
    questions: focussed,
    activeQuestionId: activeId,
    activeTeil,
  };
}

function updateQuestionsFocus(
  questions: SessionQuestion[],
  targetQuestionId: string | null
): { questions: SessionQuestion[]; activeTeil: number } {
  if (questions.length === 0) {
    return { questions, activeTeil: 1 };
  }

  const activeQuestion =
    targetQuestionId ? questions.find(question => question.id === targetQuestionId) : null;
  const activeTeil = activeQuestion
    ? normaliseTeil(activeQuestion.teil)
    : normaliseTeil(questions[0].teil);

  const derived = questions.map(question => {
    const questionTeil = normaliseTeil(question.teil);
    let teilState: TeilState = question.answered ? 'completed' : 'pending';

    if (questionTeil === activeTeil && !question.answered) {
      teilState = 'active';
    }

    if (questionTeil < activeTeil) {
      teilState = 'completed';
    }

    return {
      ...question,
      isCurrent: question.id === targetQuestionId,
      teilState,
    };
  });

  return { questions: derived, activeTeil };
}

function buildUiState(
  questions: SessionQuestion[],
  activeQuestionId: string | null,
  view: 'fragen' | 'quelle',
  version: number
) {
  if (questions.length === 0) {
    return {
      activeQuestionId: null,
      activeTeil: 1,
      activeView: view,
      currentVersion: version,
    };
  }

  const targetQuestion = activeQuestionId
    ? questions.find(question => question.id === activeQuestionId)
    : questions[0];
  const activeTeil = targetQuestion ? normaliseTeil(targetQuestion.teil) : 1;

  return {
    activeQuestionId: targetQuestion?.id ?? null,
    activeTeil,
    activeView: view,
    lastViewedQuestionId: targetQuestion?.id ?? null,
    lastViewedTeil: activeTeil,
    lastViewedView: view,
    currentVersion: version,
  };
}

interface AnswerPayload {
  questionId: string;
  answer: string | string[] | boolean;
  timeSpent: number;
  attempts: number;
  hintsUsed: number;
  timestamp: string;
}

function detectActiveView(uiState: any): 'fragen' | 'quelle' {
  const raw = uiState?.activeView;
  if (raw === 'fragen' || raw === 'quelle') {
    return raw;
  }
  return 'fragen';
}

function buildAnswerPayload(
  questions: SessionQuestion[],
  answersMap: Map<string, UserAnswer>
): AnswerPayload[] {
  return questions
    .filter(question => question.answer !== undefined && question.answer !== null)
    .map(question => {
      const existing = answersMap.get(question.id);
      const timestamp = normalizeTimestamp(existing?.timestamp);

      return {
        questionId: question.id,
        answer: question.answer!,
        timeSpent: existing?.timeSpent ?? 0,
        attempts: existing?.attempts ?? 1,
        hintsUsed: existing?.hintsUsed ?? 0,
        timestamp,
      };
    });
}

function answersEqual(
  a: string | string[] | boolean | undefined,
  b: string | string[] | boolean
): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => value === b[index]);
  }
  return a === b;
}
