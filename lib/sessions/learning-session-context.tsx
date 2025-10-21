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
} from './questions/question-types';
import { QuestionTypeName } from './questions/question-registry';
import {
  SessionTypeEnum,
  getSupportedQuestionTypes as getSupportedQuestionTypesFromRegistry,
} from './session-registry';

export enum QuestionStatus {
  LOADED = 'loaded',
  SAVING = 'saving',
  ERROR = 'error',
}

type TeilState = 'pending' | 'active' | 'completed';

type AnswerValue = string | string[] | boolean | Record<string, string>;

export interface SessionQuestion extends Question {
  answer?: AnswerValue | null;
  answered: boolean;
  status: QuestionStatus;
  teilState: TeilState;
  isCurrent: boolean;
  result?: QuestionResult;
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

interface LearningSessionContextValue {
  activeSession: Session | null;
  sessionQuestions: SessionQuestion[];
  currentQuestion: SessionQuestion | null;
  questionProgress: QuestionProgress;
  isLoading: boolean;
  isSaving: boolean;
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
    answer: AnswerValue,
    timeSpent?: number,
    hintsUsed?: number
  ) => Promise<QuestionResult | null>;
  submitTeilAnswers: (
    answers: Record<string, AnswerValue>,
    teilNumber: number
  ) => Promise<void>;
  activateTeil: (teilNumber: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  setActiveView: (view: 'fragen' | 'quelle') => void;
  setQuestionAnswer: (questionId: string, answer: AnswerValue) => void;
  completeQuestions: () => Promise<CompletionSummary | null>;
  refreshStats: () => Promise<void>;
  clearError: () => void;
  clearResults: () => void;
  getQuestionResults: () => QuestionResult[];
  getSupportedQuestionTypes: () => QuestionTypeName[];
}

const LearningSessionContext = createContext<LearningSessionContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 600;

function hasAnswer(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function normaliseAnswer(
  value: AnswerValue | null | undefined
): AnswerValue | null {
  if (value === undefined) {
    return null;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as Record<string, string>) };
  }

  return value;
}

function deriveActiveQuestionId(
  questions: Question[],
  preferredId?: string | null
): string | null {
  if (preferredId && questions.some(question => question.id === preferredId)) {
    return preferredId;
  }
  const firstUnanswered = questions.find(question => !hasAnswer((question as any).answer));
  if (firstUnanswered?.id) {
    return firstUnanswered.id;
  }
  return questions[0]?.id ?? null;
}

function toSessionQuestion(
  question: Question,
  currentQuestionId: string | null
): SessionQuestion {
  const answer = normaliseAnswer((question as any).answer);
  const result = (question as any).result as QuestionResult | undefined;
  const answered = hasAnswer(answer);
  const isCurrent = question.id === currentQuestionId;
  const teilState: TeilState = isCurrent ? 'active' : answered ? 'completed' : 'pending';

  return {
    ...question,
    answer,
    answered,
    result,
    isCurrent,
    teilState,
    status: QuestionStatus.LOADED,
  };
}

function withCurrentQuestionState(
  questions: SessionQuestion[],
  activeQuestionId: string | null
): SessionQuestion[] {
  return questions.map(question => {
    const isCurrent = question.id === activeQuestionId;
    return {
      ...question,
      isCurrent,
      teilState: isCurrent ? 'active' : question.answered ? 'completed' : 'pending',
    };
  });
}

function stripQuestionForSave(question: SessionQuestion): Question {
  const {
    isCurrent,
    teilState,
    status,
    result,
    ...rest
  } = question as any;

  return {
    ...rest,
    answer: normaliseAnswer(rest.answer),
  };
}

function cloneQuestionsForSession(questions: Question[]): Question[] {
  return questions.map(question => ({
    ...question,
    options: Array.isArray(question.options)
      ? question.options.map(option => ({ ...option }))
      : question.options,
    gaps: Array.isArray(question.gaps)
      ? question.gaps.map(gap => ({
          ...gap,
          options: Array.isArray(gap.options) ? [...gap.options] : gap.options,
        }))
      : question.gaps,
    answer: Array.isArray(question.answer)
      ? [...question.answer]
      : question.answer && typeof question.answer === 'object'
        ? { ...(question.answer as Record<string, string>) }
        : question.answer,
  })) as Question[];
}

async function requestJson<TResponse>(
  input: RequestInfo,
  init?: RequestInit
): Promise<TResponse> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(details || response.statusText || 'Request failed');
  }
  return (await response.json()) as TResponse;
}

export function LearningSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestion[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [activeView, setActiveViewState] = useState<'fragen' | 'quelle'>('fragen');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [latestResults, setLatestResults] = useState<CompletionSummary | null>(null);

  const activeSessionRef = useRef<Session | null>(null);
  const questionsRef = useRef<SessionQuestion[]>([]);
  const activeQuestionIdRef = useRef<string | null>(null);
  const pendingUpdateRef = useRef<UpdateSessionInput | null>(null);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isFlushingRef = useRef(false);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    questionsRef.current = sessionQuestions;
  }, [sessionQuestions]);

  useEffect(() => {
    activeQuestionIdRef.current = activeQuestionId;
  }, [activeQuestionId]);

  const clearError = useCallback(() => setError(null), []);
  const clearResults = useCallback(() => setLatestResults(null), []);

  const flushPendingUpdates = useCallback(async () => {
    if (isFlushingRef.current) {
      return;
    }
    const session = activeSessionRef.current;
    const payload = pendingUpdateRef.current;
    if (!session || !payload) {
      return;
    }

    pendingUpdateRef.current = null;
    isFlushingRef.current = true;
    if (isMountedRef.current) {
      setIsSaving(true);
    }
    try {
      const updatedSession = await requestJson<Session>(
        `/api/sessions/${session.id}/update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (isMountedRef.current) {
        setActiveSession(updatedSession);
      }
      activeSessionRef.current = updatedSession;
    } catch (err) {
      console.error('Failed to persist session', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to save session');
      }
    } finally {
      isFlushingRef.current = false;
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, []);

  const syncActiveSessionQuestions = useCallback((metadata?: Record<string, any>) => {
    const sanitizedQuestions = questionsRef.current.map(stripQuestionForSave);

    const session = activeSessionRef.current;
    if (!session) {
      return sanitizedQuestions;
    }

    const nextSession: Session = {
      ...session,
      metadata: {
        ...(session.metadata ?? {}),
        ...(metadata ?? {}),
      },
      data: {
        ...session.data,
        questions: cloneQuestionsForSession(sanitizedQuestions),
      },
    };

    activeSessionRef.current = nextSession;
    setActiveSession(nextSession);

    return sanitizedQuestions;
  }, []);

  const updateSessionMetadata = useCallback((metadata: Record<string, any>) => {
    const session = activeSessionRef.current;
    if (!session) {
      return;
    }

    const nextSession: Session = {
      ...session,
      metadata: {
        ...(session.metadata ?? {}),
        ...metadata,
      },
    };

    activeSessionRef.current = nextSession;
    setActiveSession(nextSession);
  }, []);

  const enqueueUpdate = useCallback(
    (update: UpdateSessionInput) => {
      const existing = pendingUpdateRef.current;
      pendingUpdateRef.current = {
        data: {
          ...(existing?.data ?? {}),
          ...(update.data ?? {}),
        },
        metadata: {
          ...(existing?.metadata ?? {}),
          ...(update.metadata ?? {}),
        },
        status: update.status ?? existing?.status,
        duration: update.duration ?? existing?.duration,
      };

      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }

      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        void flushPendingUpdates();
      }, SAVE_DEBOUNCE_MS);
    },
    [flushPendingUpdates]
  );

  const forceSave = useCallback(async () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    await flushPendingUpdates();
  }, [flushPendingUpdates]);

  const sendBeaconForPendingUpdates = useCallback(() => {
    const session = activeSessionRef.current;
    const payload = pendingUpdateRef.current;
    if (!session || !payload || typeof navigator === 'undefined' || !navigator.sendBeacon) {
      return false;
    }

    try {
      const url = `/api/sessions/${session.id}/update`;
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      });
      const sent = navigator.sendBeacon(url, blob);
      if (sent) {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        pendingUpdateRef.current = null;
      }
      return sent;
    } catch (error) {
      console.warn('Failed to send beacon update', error);
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pendingUpdateRef.current) {
        void flushPendingUpdates();
      }
    };
  }, [flushPendingUpdates]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const sent = sendBeaconForPendingUpdates();
        if (!sent) {
          void forceSave();
        }
      }
    };

    const handleBeforeUnload = () => {
      const sent = sendBeaconForPendingUpdates();
      if (!sent) {
        void forceSave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [forceSave, sendBeaconForPendingUpdates]);

  const questionProgress = useMemo<QuestionProgress>(() => {
    const total = sessionQuestions.length;
    const answered = sessionQuestions.filter(question => question.answered).length;
    const currentIndex = sessionQuestions.findIndex(question => question.isCurrent);
    const completedTeils = new Set(
      sessionQuestions
        .filter(question => question.teilState === 'completed')
        .map(question => question.teil ?? 1)
    );

    return {
      current: currentIndex >= 0 ? currentIndex + 1 : 0,
      total,
      answered,
      completedTeilCount: completedTeils.size,
    };
  }, [sessionQuestions]);

  const currentQuestion = useMemo(
    () => sessionQuestions.find(question => question.isCurrent) ?? null,
    [sessionQuestions]
  );

  const refreshStats = useCallback(async () => {
    try {
      const result = await requestJson<SessionStats>('/api/sessions/stats');
      setStats(result);
    } catch (err) {
      console.warn('Failed to refresh session stats', err);
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const buildSessionState = useCallback((session: Session) => {
    const questions = Array.isArray(session.data?.questions)
      ? (session.data.questions as Question[])
      : [];

    const derivedActiveView =
      session.metadata?.activeView === 'quelle' ? 'quelle' : 'fragen';
    const derivedActiveId = deriveActiveQuestionId(
      questions,
      session.metadata?.activeQuestionId
    );

    const statefulQuestions = withCurrentQuestionState(
      questions.map(question => toSessionQuestion(question, derivedActiveId)),
      derivedActiveId
    );

    setActiveSession(session);
    activeSessionRef.current = session;
    setSessionQuestions(statefulQuestions);
    questionsRef.current = statefulQuestions;
    setActiveQuestionId(derivedActiveId);
    activeQuestionIdRef.current = derivedActiveId;
    setActiveViewState(derivedActiveView);
  }, []);

  const startSession = useCallback(
    async (
      type: SessionType | SessionTypeEnum,
      metadata?: Record<string, any>
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const session = await requestJson<Session>('/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, metadata }),
        });

        buildSessionState(session);
        setLatestResults(null);
        return session;
      } catch (err) {
        console.error('Failed to start session', err);
        setError(err instanceof Error ? err.message : 'Failed to start session');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [buildSessionState]
  );

  const initializeSession = useCallback(
    async (sessionId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const session = await requestJson<Session>(`/api/sessions/${sessionId}`, {
          cache: 'no-store',
        });
        buildSessionState(session);
        setLatestResults(null);
        return session;
      } catch (err) {
        console.error('Failed to load session', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [buildSessionState]
  );

  const setQuestionAnswer = useCallback(
    (questionId: string, answerValue: AnswerValue) => {
      const session = activeSessionRef.current;
      if (!session) {
        return;
      }

      setSessionQuestions(previous => {
        const updated = previous.map(question => {
          if (question.id !== questionId) {
            return question;
          }

          const normalised = normaliseAnswer(answerValue);
          return {
            ...question,
            answer: normalised,
            answered: hasAnswer(normalised),
            result: undefined,
          };
        });

        const withState = withCurrentQuestionState(updated, activeQuestionIdRef.current);
        questionsRef.current = withState;
        return withState;
      });

      const sanitizedQuestions = syncActiveSessionQuestions({
        activeQuestionId: activeQuestionIdRef.current,
        activeView,
      });
      enqueueUpdate({
        data: { questions: sanitizedQuestions },
        metadata: {
          activeQuestionId: activeQuestionIdRef.current,
          activeView,
        },
      });
    },
    [activeView, enqueueUpdate, syncActiveSessionQuestions]
  );

  const updateActiveQuestion = useCallback(
    (nextQuestionId: string | null) => {
      setActiveQuestionId(nextQuestionId);
      const updated = withCurrentQuestionState(
        questionsRef.current,
        nextQuestionId
      );
      questionsRef.current = updated;
      setSessionQuestions(updated);

      updateSessionMetadata({
        activeQuestionId: nextQuestionId,
        activeView,
      });

      enqueueUpdate({
        metadata: {
          activeQuestionId: nextQuestionId,
          activeView,
        },
      });
    },
    [activeView, enqueueUpdate, updateSessionMetadata]
  );

  const nextQuestion = useCallback(() => {
    const questions = questionsRef.current;
    if (!questions.length) {
      return;
    }

    const currentIndex = questions.findIndex(question => question.isCurrent);
    const target =
      currentIndex >= 0 && currentIndex < questions.length - 1
        ? questions[currentIndex + 1]
        : questions[Math.max(currentIndex, 0)];

    if (target) {
      updateActiveQuestion(target.id);
    }
  }, [updateActiveQuestion]);

  const previousQuestion = useCallback(() => {
    const questions = questionsRef.current;
    if (!questions.length) {
      return;
    }

    const currentIndex = questions.findIndex(question => question.isCurrent);
    const target =
      currentIndex > 0 ? questions[currentIndex - 1] : questions[Math.max(currentIndex, 0)];

    if (target) {
      updateActiveQuestion(target.id);
    }
  }, [updateActiveQuestion]);

  const activateTeil = useCallback(
    (teilNumber: number) => {
      const questions = questionsRef.current;
      const target = questions.find(
        question => (question.teil ?? 1) === teilNumber
      );
      if (target) {
        updateActiveQuestion(target.id);
      }
    },
    [updateActiveQuestion]
  );

  const setActiveView = useCallback(
    (view: 'fragen' | 'quelle') => {
      if (view === activeView) {
        return;
      }
      setActiveViewState(view);
      updateSessionMetadata({
        activeView: view,
        activeQuestionId: activeQuestionIdRef.current,
      });

      enqueueUpdate({
        metadata: {
          activeView: view,
          activeQuestionId: activeQuestionIdRef.current,
        },
      });
    },
    [activeView, enqueueUpdate, updateSessionMetadata]
  );

  const submitAnswer = useCallback(
    async (
      questionId: string,
      answerValue: AnswerValue,
      timeSpent: number = 0,
      hintsUsed: number = 0
    ) => {
      const session = activeSessionRef.current;
      if (!session) {
        setError('No active session');
        return null;
      }

      setIsSubmitting(true);
      setError(null);
      try {
        const result = await requestJson<QuestionResult>(
          `/api/sessions/${session.id}/answer`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId,
              answer: answerValue,
              timeSpent,
              hintsUsed,
            }),
          }
        );

        setSessionQuestions(previous => {
          const next = previous.map(question =>
            question.id === questionId
              ? {
                  ...question,
                  answer: normaliseAnswer(answerValue),
                  answered: true,
                  result,
                }
              : question
          );
          questionsRef.current = next;
          return next;
        });

        syncActiveSessionQuestions();

        void forceSave();
        return result;
      } catch (err) {
        console.error('Failed to submit answer', err);
        setError(err instanceof Error ? err.message : 'Failed to submit answer');
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [forceSave, syncActiveSessionQuestions]
  );

  const submitTeilAnswers = useCallback(
    async (answers: Record<string, AnswerValue>) => {
      const session = activeSessionRef.current;
      if (!session) {
        setError('No active session');
        return;
      }

      setIsSubmitting(true);
      setError(null);
      try {
        Object.entries(answers).forEach(([questionId, value]) => {
          setQuestionAnswer(questionId, value);
        });

        await forceSave();

        const response = await requestJson<{
          results: QuestionResult[];
        }>(`/api/sessions/${session.id}/mark`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers }),
        });

        setSessionQuestions(previous => {
          const next = previous.map(question => {
            const result = response.results.find(
              item => item.questionId === question.id
            );
            if (!result) {
              return question;
            }
            return {
              ...question,
              answered: true,
              result,
            };
          });
          questionsRef.current = next;
          return next;
        });
        syncActiveSessionQuestions();
      } catch (err) {
        console.error('Failed to submit Teil answers', err);
        setError(err instanceof Error ? err.message : 'Failed to submit answers');
      } finally {
        setIsSubmitting(false);
      }
    },
    [forceSave, setQuestionAnswer, syncActiveSessionQuestions]
  );

  const completeQuestions = useCallback(async (): Promise<CompletionSummary | null> => {
    const session = activeSessionRef.current;
    if (!session) {
      setError('No active session');
      return null;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await forceSave();
      const completion = await requestJson<CompletionSummary>(
        `/api/sessions/${session.id}/complete`,
        { method: 'POST' }
      );

      setLatestResults(completion);
      setSessionQuestions(previous => {
        const next = previous.map(question => {
          const result = completion.results.find(
            entry => entry.questionId === question.id
          );
          if (!result) {
            return {
              ...question,
              answered: true,
            };
          }
          return {
            ...question,
            answer: normaliseAnswer(result.userAnswer.answer),
            answered: true,
            result,
          };
        });
        questionsRef.current = next;
        return next;
      });
      syncActiveSessionQuestions();

      return completion;
    } catch (err) {
      console.error('Failed to complete questions', err);
      setError(err instanceof Error ? err.message : 'Failed to complete questions');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [forceSave, syncActiveSessionQuestions]);

  const endSession = useCallback(
    async (status: 'completed' | 'abandoned' = 'completed') => {
      const session = activeSessionRef.current;
      if (!session) {
        return;
      }

      try {
        await forceSave();
        const updated = await requestJson<Session>(
          `/api/sessions/${session.id}/end`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          }
        );

        setActiveSession(updated);
        activeSessionRef.current = updated;
      } catch (err) {
        console.error('Failed to end session', err);
        setError(err instanceof Error ? err.message : 'Failed to end session');
      }
    },
    [forceSave]
  );

  const getQuestionResults = useCallback((): QuestionResult[] => {
    return sessionQuestions
      .map(question => question.result)
      .filter((result): result is QuestionResult => !!result);
  }, [sessionQuestions]);

  const getSupportedQuestionTypes = useCallback((): QuestionTypeName[] => {
    if (!activeSession) {
      return [];
    }
    return getSupportedQuestionTypesFromRegistry(activeSession.type as SessionTypeEnum);
  }, [activeSession]);

  const value = useMemo<LearningSessionContextValue>(
    () => ({
      activeSession,
      sessionQuestions,
      currentQuestion,
      questionProgress,
      isLoading,
      isSaving,
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
      sessionQuestions,
      currentQuestion,
      questionProgress,
      isLoading,
      isSaving,
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
    ]
  );

  return (
    <LearningSessionContext.Provider value={value}>
      {children}
    </LearningSessionContext.Provider>
  );
}

export function useLearningSession(): LearningSessionContextValue {
  const context = useContext(LearningSessionContext);
  if (!context) {
    throw new Error('useLearningSession must be used within LearningSessionProvider');
  }
  return context;
}
