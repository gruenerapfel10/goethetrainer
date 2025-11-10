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
  AnswerValue,
  SessionGenerationState,
} from './types';
import type {
  Question,
  QuestionResult,
} from './questions/question-types';
import {
  SessionTypeEnum,
  getSupportedModules as getSupportedModulesFromRegistry,
} from './session-registry';
import { QuestionModuleId } from '@/lib/questions/modules/types';
import { buildQuestionSessionSummary } from './question-summary';

export enum QuestionStatus {
  LOADED = 'loaded',
  SAVING = 'saving',
  ERROR = 'error',
}

type TeilState = 'pending' | 'active' | 'completed';

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

type LatestResultsState = CompletionSummary & { sessionType: SessionTypeEnum };

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
  generationState: SessionGenerationState | null;
  isGeneratingQuestions: boolean;
  sessionProgress: ReturnType<typeof deriveProgressSummary> | null;
  sessionMetrics: Record<string, number>;
  isLoading: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  error: string | null;
  stats: SessionStats | null;
  activeView: 'fragen' | 'quelle';
  latestResults: LatestResultsState | null;
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
  getSupportedModules: () => QuestionModuleId[];
}

const LearningSessionContext = createContext<LearningSessionContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 450;

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

function defaultNormaliseAnswer(
  value: AnswerValue | null | undefined
): AnswerValue | null {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return [...value] as AnswerValue;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return JSON.parse(JSON.stringify(value));
  }

  return value;
}

function normaliseSingleSelection(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function normaliseGapAnswerValue(
  question: Question,
  value: unknown
): Record<string, string> | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const fallbackId =
      question.gaps?.[0]?.id ??
      (Array.isArray(question.gaps) && question.gaps.length > 0
        ? question.gaps[0]?.id
        : null) ??
      'GAP_0';
    return { [fallbackId]: trimmed };
  }
  if (typeof value === 'object' && value) {
    const allowedIds = new Set(
      (question.gaps ?? [])
        .map(gap => gap.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    const result: Record<string, string> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
      if (typeof raw !== 'string') {
        return;
      }
      const trimmed = raw.trim();
      if (!trimmed) {
        return;
      }
      if (allowedIds.size === 0 || allowedIds.has(key)) {
        result[key] = trimmed;
      }
    });
    return Object.keys(result).length > 0 ? result : null;
  }
  return null;
}

function normaliseStatementMatchAnswer(
  question: Question,
  value: unknown
): Record<string, string> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const statements = question.statements ?? [];
  const allowedIds = new Set(statements.map(statement => statement.id));
  const allowedOptions = new Set(
    (question.options ?? []).map(option => option.id ?? option.text)
  );

  const entries = Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [statementId, rawValue]) => {
      if (
        typeof rawValue === 'string' &&
        rawValue.trim().length > 0 &&
        (allowedIds.size === 0 || allowedIds.has(statementId)) &&
        (allowedOptions.size === 0 || allowedOptions.has(rawValue.trim()))
      ) {
        acc[statementId] = rawValue.trim();
      }
      return acc;
    },
    {}
  );

  return Object.keys(entries).length > 0 ? entries : null;
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
  const answer = normaliseAnswerForQuestion(question, (question as any).answer);
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

function deriveProgressSummary(questions: SessionQuestion[]) {
  const totalQuestions = questions.length;
  const answeredQuestions = questions.filter(question => question.answered).length;
  const correctAnswers = questions.filter(question => question.result?.isCorrect).length;
  const score = questions.reduce(
    (sum, question) => sum + (question.result?.score ?? 0),
    0
  );
  const maxScore = questions.reduce(
    (sum, question) => sum + (question.points ?? 0),
    0
  );

  return {
    totalQuestions,
    answeredQuestions,
    correctAnswers,
    score,
    maxScore,
  };
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
    answer: defaultNormaliseAnswer(rest.answer),
  };
}

function cloneQuestionsForSession(questions: Question[]): Question[] {
  return questions.map(question => ({
    ...question,
    options: Array.isArray(question.options)
      ? question.options.map(option => JSON.parse(JSON.stringify(option)))
      : question.options,
    gaps: Array.isArray(question.gaps)
      ? question.gaps.map(gap => JSON.parse(JSON.stringify(gap)))
      : question.gaps,
    answer: Array.isArray(question.answer)
      ? JSON.parse(JSON.stringify(question.answer))
      : question.answer && typeof question.answer === 'object'
        ? JSON.parse(JSON.stringify(question.answer))
        : question.answer ?? null,
  })) as Question[];
}

function answersEqual(a: AnswerValue | undefined, b: AnswerValue | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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
  const [latestResults, setLatestResults] = useState<LatestResultsState | null>(null);
  const [generationState, setGenerationState] = useState<SessionGenerationState | null>(null);

  const activeSessionRef = useRef<Session | null>(null);
  const questionsRef = useRef<SessionQuestion[]>([]);
  const activeQuestionIdRef = useRef<string | null>(null);
  const pendingUpdateRef = useRef<UpdateSessionInput | null>(null);
  const pendingAnswersRef = useRef<Record<string, AnswerValue>>({});
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isFlushingRef = useRef(false);
  const activeFlushPromiseRef = useRef<Promise<boolean> | null>(null);
  const resolveFlushPromiseRef = useRef<((value: boolean) => void) | null>(null);
  const isCompletingRef = useRef(false);
  const sessionEventSourceRef = useRef<EventSource | null>(null);
  const sessionEventRetryRef = useRef<number | null>(null);
  const sessionEventSessionIdRef = useRef<string | null>(null);

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

  const flushPendingUpdates = useCallback(async (): Promise<boolean> => {
    if (isFlushingRef.current && activeFlushPromiseRef.current) {
      return activeFlushPromiseRef.current;
    }

    const session = activeSessionRef.current;
    const pendingPayload = pendingUpdateRef.current;
    if (!session || !pendingPayload) {
      return false;
    }

    const answersPayload = pendingPayload.answers
      ? { ...pendingPayload.answers }
      : Object.keys(pendingAnswersRef.current).length > 0
        ? { ...pendingAnswersRef.current }
        : undefined;

    const payload: UpdateSessionInput = {
      ...pendingPayload,
      answers: answersPayload,
    };

    pendingUpdateRef.current = null;
    isFlushingRef.current = true;
    const flushPromise = new Promise<boolean>(resolve => {
      resolveFlushPromiseRef.current = resolve;
    });
    activeFlushPromiseRef.current = flushPromise;
    if (isMountedRef.current) {
      setIsSaving(true);
    }

    let success = false;

    try {
      const updatedSession = await requestJson<Session>(
        `/api/sessions/${session.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (answersPayload) {
        Object.entries(answersPayload).forEach(([key, value]) => {
          if (key in pendingAnswersRef.current && answersEqual(pendingAnswersRef.current[key], value)) {
            delete pendingAnswersRef.current[key];
          }
        });
      }

      if (isMountedRef.current) {
        setActiveSession(updatedSession);
      }
      activeSessionRef.current = updatedSession;
      success = true;
    } catch (err) {
      if (answersPayload) {
        pendingAnswersRef.current = {
          ...answersPayload,
          ...pendingAnswersRef.current,
        };
      }

      const mergedAnswers = {
        ...(payload.answers ?? {}),
      };
      const mergedData = {
        ...(payload.data ?? {}),
      };
      const mergedMetadata = {
        ...(payload.metadata ?? {}),
      };

      pendingUpdateRef.current = {
        answers: Object.keys(mergedAnswers).length > 0 ? mergedAnswers : undefined,
        data: Object.keys(mergedData).length > 0 ? mergedData : undefined,
        metadata:
          Object.keys(mergedMetadata).length > 0
            ? { ...mergedMetadata, lastUpdatedAt: new Date().toISOString() }
            : undefined,
        status: payload.status as 'active' | 'completed' | 'abandoned',
        duration: payload.duration,
      };

      console.error('Failed to persist session', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to save session');
      }

      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushPendingUpdates();
        }, SAVE_DEBOUNCE_MS);
      }
    } finally {
      isFlushingRef.current = false;
      if (isMountedRef.current) {
        setIsSaving(false);
      }
      if (resolveFlushPromiseRef.current) {
        resolveFlushPromiseRef.current(success);
      }
      activeFlushPromiseRef.current = null;
      resolveFlushPromiseRef.current = null;
      return success;
    }
  }, []);

  const syncActiveSessionQuestions = useCallback((metadata?: Record<string, any>) => {
    const sanitizedQuestions = questionsRef.current.map(stripQuestionForSave);

    const session = activeSessionRef.current;
    if (!session) {
      return sanitizedQuestions;
    }

    const currentQuestion = questionsRef.current.find(
      question => question.id === activeQuestionIdRef.current
    );
    const progressSummary = deriveProgressSummary(questionsRef.current);

    const nextSession: Session = {
      ...session,
      metadata: {
        ...(session.metadata ?? {}),
        ...(metadata ?? {}),
        lastUpdatedAt: new Date().toISOString(),
      },
      data: {
        ...session.data,
        questions: cloneQuestionsForSession(sanitizedQuestions),
        state: {
          ...(session.data?.state ?? {}),
          activeTeil: (currentQuestion?.teil ?? session.data?.state?.activeTeil ?? null) as number | null,
          activeQuestionId: metadata?.activeQuestionId ?? activeQuestionIdRef.current,
          activeView: (metadata?.activeView ??
            session.data?.state?.activeView ??
            'fragen') as 'fragen' | 'quelle' | 'overview',
        },
        progress: progressSummary,
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

    const nextState: Record<string, any> = {
      ...(session.data?.state ?? {}),
    };

    if ('activeQuestionId' in metadata) {
      nextState.activeQuestionId = metadata.activeQuestionId;
    }
    if ('activeView' in metadata) {
      nextState.activeView = metadata.activeView;
    }
    if ('activeTeil' in metadata) {
      nextState.activeTeil = metadata.activeTeil;
    }

    const nextSession: Session = {
      ...session,
      metadata: {
        ...(session.metadata ?? {}),
        ...metadata,
        lastUpdatedAt: new Date().toISOString(),
      },
      data: {
        ...session.data,
        state: nextState as any,
      },
    };

    activeSessionRef.current = nextSession;
    setActiveSession(nextSession);
  }, []);

  const enqueueUpdate = useCallback(
    (update: UpdateSessionInput) => {
      const existing = pendingUpdateRef.current;
      const answersMerged = {
        ...(existing?.answers ?? {}),
        ...(pendingAnswersRef.current ?? {}),
        ...(update.answers ?? {}),
      };
      const nextMetadata = {
        ...(existing?.metadata ?? {}),
        ...(update.metadata ?? {}),
        lastUpdatedAt: new Date().toISOString(),
      };
      pendingUpdateRef.current = {
        data: {
          ...(existing?.data ?? {}),
          ...(update.data ?? {}),
        },
        metadata: nextMetadata,
        answers: Object.keys(answersMerged).length > 0 ? answersMerged : undefined,
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

  const forceSave = useCallback(async (): Promise<boolean> => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    return await flushPendingUpdates();
  }, [flushPendingUpdates]);

  const sendBeaconForPendingUpdates = useCallback(() => {
    const session = activeSessionRef.current;
    const payload = pendingUpdateRef.current ?? (
      Object.keys(pendingAnswersRef.current).length > 0
        ? {
            answers: { ...pendingAnswersRef.current },
            metadata: {
              activeQuestionId: activeQuestionIdRef.current,
              activeView,
            },
          }
        : null
    );

    if (
      !session ||
      !payload ||
      typeof navigator === 'undefined' ||
      !navigator.sendBeacon
    ) {
      return false;
    }

    try {
      const url = `/api/sessions/${session.id}`;
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
  }, [activeView]);

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
    const expectedTotal = Math.max(
      sessionQuestions.length,
      generationState?.total ?? 0
    );
    const answered = sessionQuestions.filter(question => question.answered).length;
    const currentIndex = sessionQuestions.findIndex(question => question.isCurrent);
    const completedTeils = new Set(
      sessionQuestions
        .filter(question => question.teilState === 'completed')
        .map(question => question.teil ?? 1)
    );

    return {
      current: currentIndex >= 0 ? currentIndex + 1 : 0,
      total: expectedTotal,
      answered,
      completedTeilCount: completedTeils.size,
    };
  }, [sessionQuestions, generationState?.total]);

  const currentQuestion = useMemo(
    () => sessionQuestions.find(question => question.isCurrent) ?? null,
    [sessionQuestions]
  );

  const isGeneratingQuestions = generationState?.status === 'in_progress';

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

  const buildSessionState = useCallback(
    (session: Session, options: { merge?: boolean } = {}) => {
      const { merge = false } = options;

      const questions = Array.isArray(session.data?.questions)
        ? (session.data.questions as Question[])
        : [];
      const serverResults = Array.isArray(session.data?.results)
        ? (session.data.results as QuestionResult[])
        : [];
      const shouldHydrateResults =
        session.status === 'completed' && serverResults.length > 0;

      const hydrateResults = () => {
        if (shouldHydrateResults) {
          setLatestResults(prev => {
            if (prev?.sessionType === session.type) {
              return prev;
            }
            return {
              sessionType: session.type as SessionTypeEnum,
              results: serverResults,
              summary: buildQuestionSessionSummary(serverResults, questions),
            };
          });
        } else if (!merge) {
          setLatestResults(null);
        }
      };

      const derivedActiveView =
        session.metadata?.activeView === 'quelle' ? 'quelle' : 'fragen';

      if (!merge) {
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
        setGenerationState(session.data?.generation ?? null);
        setSessionQuestions(statefulQuestions);
        questionsRef.current = statefulQuestions;
        setActiveQuestionId(derivedActiveId);
        activeQuestionIdRef.current = derivedActiveId;
        setActiveViewState(derivedActiveView);
        pendingAnswersRef.current = {};
        pendingUpdateRef.current = null;
        hydrateResults();
        return;
      }

      const existingQuestions = questionsRef.current;
      const existingMap = new Map(existingQuestions.map(question => [question.id, question]));

      const currentActiveId = activeQuestionIdRef.current;
      const derivedActiveId = currentActiveId && questions.some(q => q.id === currentActiveId)
        ? currentActiveId
        : deriveActiveQuestionId(questions, session.metadata?.activeQuestionId);

      const mergedQuestions = questions.map(question => {
        const existing = existingMap.get(question.id);
        if (!existing) {
          return toSessionQuestion(question, derivedActiveId);
        }

        const base = toSessionQuestion(question, derivedActiveId);
        const hasLocalAnswer = hasAnswer(existing.answer);

        return {
          ...base,
          ...existing,
          answer: hasLocalAnswer ? existing.answer : base.answer,
          answered: hasLocalAnswer ? existing.answered : base.answered,
          result: base.result ?? existing.result,
          status: existing.status === QuestionStatus.SAVING ? existing.status : QuestionStatus.LOADED,
        };
      });

      const statefulQuestions = withCurrentQuestionState(mergedQuestions, derivedActiveId);

      setActiveSession(session);
      activeSessionRef.current = session;
      setGenerationState(session.data?.generation ?? null);
      setSessionQuestions(statefulQuestions);
      questionsRef.current = statefulQuestions;
      if (!currentActiveId || currentActiveId !== derivedActiveId) {
        setActiveQuestionId(derivedActiveId);
        activeQuestionIdRef.current = derivedActiveId;
      }
      hydrateResults();
    },
    [setLatestResults]
  );

  const refreshSessionSnapshot = useCallback(
    async (sessionId: string) => {
      try {
        const session = await requestJson<Session>(`/api/sessions/${sessionId}`, {
          cache: 'no-store',
        });
        buildSessionState(session, { merge: true });
        return session;
      } catch (err) {
        console.error('Failed to refresh session snapshot', err);
        return null;
      }
    },
    [buildSessionState]
  );

  const stopSessionEventStream = useCallback(() => {
    if (sessionEventRetryRef.current) {
      clearTimeout(sessionEventRetryRef.current);
      sessionEventRetryRef.current = null;
    }
    if (sessionEventSourceRef.current) {
      sessionEventSourceRef.current.close();
      sessionEventSourceRef.current = null;
    }
    sessionEventSessionIdRef.current = null;
  }, []);

  const startSessionEventStream = useCallback(
    (sessionId: string) => {
      if (typeof window === 'undefined') {
        return;
      }
      stopSessionEventStream();
      sessionEventSessionIdRef.current = sessionId;
      const source = new EventSource(`/api/sessions/${sessionId}/events`);
      sessionEventSourceRef.current = source;

      source.onmessage = () => {
        void refreshSessionSnapshot(sessionId);
      };

      source.onerror = () => {
        source.close();
        sessionEventSourceRef.current = null;
        if (sessionEventSessionIdRef.current !== sessionId) {
          return;
        }
        sessionEventRetryRef.current = window.setTimeout(() => {
          if (sessionEventSessionIdRef.current) {
            startSessionEventStream(sessionEventSessionIdRef.current);
          }
        }, 2000);
      };
    },
    [refreshSessionSnapshot, stopSessionEventStream]
  );

  useEffect(() => stopSessionEventStream, [stopSessionEventStream]);

  useEffect(() => {
    if (!activeSession?.id) {
      stopSessionEventStream();
    }
  }, [activeSession?.id, stopSessionEventStream]);

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
        if (session?.id) {
          startSessionEventStream(session.id);
        }
        return session;
      } catch (err) {
        console.error('Failed to start session', err);
        setError(err instanceof Error ? err.message : 'Failed to start session');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [buildSessionState, startSessionEventStream]
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
        if (session?.id) {
          startSessionEventStream(session.id);
        }
        return session;
      } catch (err) {
        console.error('Failed to load session', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [buildSessionState, startSessionEventStream]
  );

  const setQuestionAnswer = useCallback(
    (questionId: string, answerValue: AnswerValue) => {
      const session = activeSessionRef.current;
      if (!session || session.status === 'completed') {
        return;
      }

      const sourceQuestion =
        questionsRef.current.find(question => question.id === questionId) ??
        (session.data.questions as Question[] | undefined)?.find(question => question.id === questionId);

      const normalised = sourceQuestion
        ? normaliseAnswerForQuestion(sourceQuestion, answerValue)
        : defaultNormaliseAnswer(answerValue);

      setSessionQuestions(previous => {
        const updated = previous.map(question => {
          if (question.id !== questionId) {
            return question;
          }

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

      pendingAnswersRef.current = {
        ...pendingAnswersRef.current,
        [questionId]: normalised ?? null,
      };

      const updatedQuestions = questionsRef.current;
      const progressSummary = deriveProgressSummary(updatedQuestions);
      const activeQuestion = updatedQuestions.find(
        question => question.id === activeQuestionIdRef.current
      );
      const nextState = {
        activeTeil: (activeQuestion?.teil ?? null) as number | null,
        activeQuestionId: activeQuestionIdRef.current,
        activeView,
      };

      syncActiveSessionQuestions({
        activeQuestionId: activeQuestionIdRef.current,
        activeView,
      });
      enqueueUpdate({
        answers: { [questionId]: normalised ?? null },
        metadata: {
          activeQuestionId: activeQuestionIdRef.current,
          activeView,
        },
        data: {
          progress: progressSummary,
          state: nextState,
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

      const activeQuestion = updated.find(question => question.id === nextQuestionId);
      const nextState = {
        activeQuestionId: nextQuestionId,
        activeView,
        activeTeil: (activeQuestion?.teil ?? null) as number | null,
      };

      updateSessionMetadata({
        activeQuestionId: nextQuestionId,
        activeView,
      });

      enqueueUpdate({
        metadata: {
          activeQuestionId: nextQuestionId,
          activeView,
        },
        data: {
          state: nextState,
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
      const currentQuestion = questionsRef.current.find(
        question => question.id === activeQuestionIdRef.current
      );
      const nextState = {
        activeView: view,
        activeQuestionId: activeQuestionIdRef.current,
        activeTeil: (currentQuestion?.teil ?? null) as number | null,
      };

      updateSessionMetadata({
        activeView: view,
        activeQuestionId: activeQuestionIdRef.current,
        activeTeil: nextState.activeTeil,
      });

      enqueueUpdate({
        metadata: {
          activeView: view,
          activeQuestionId: activeQuestionIdRef.current,
        },
        data: {
          state: nextState,
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
      if (session.status === 'completed') {
        setError('Diese Sitzung wurde bereits abgeschlossen.');
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
                  answer: normaliseAnswerForQuestion(question, answerValue),
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
      if (!session || session.status === 'completed') {
        setError('No active session');
        return;
      }

      setIsSubmitting(true);
      setError(null);
      try {
        Object.entries(answers).forEach(([questionId, value]) => {
          setQuestionAnswer(questionId, value);
        });

        void forceSave();
      } catch (err) {
        console.error('Failed to submit Teil answers', err);
        setError(err instanceof Error ? err.message : 'Failed to submit answers');
      } finally {
        setIsSubmitting(false);
      }
    },
    [forceSave, setQuestionAnswer]
  );

  const completeQuestions = useCallback(async (): Promise<CompletionSummary | null> => {
    const session = activeSessionRef.current;
    if (!session) {
      setError('No active session');
      return null;
    }

    if (session.status === 'completed') {
      if (
        !latestResults &&
        Array.isArray(session.data?.results) &&
        session.data.results.length > 0
      ) {
        const questions = Array.isArray(session.data?.questions)
          ? (session.data.questions as Question[])
          : [];
        const results = session.data.results as QuestionResult[];
        const summary = buildQuestionSessionSummary(results, questions);
        const completion = { results, summary };
        setLatestResults({
          ...completion,
          sessionType: session.type as SessionTypeEnum,
        });
        return completion;
      }
      return latestResults;
    }

    setIsSubmitting(true);
    setError(null);

    if (isCompletingRef.current) {
      return null;
    }

    isCompletingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const flushed = await forceSave();
      if (!flushed && (pendingUpdateRef.current || Object.keys(pendingAnswersRef.current).length > 0)) {
        setError('Konnte Antworten nicht speichern. Bitte erneut versuchen, bevor du den Test abgibst.');
        return null;
      }

      const completion = await requestJson<CompletionSummary>(
        `/api/sessions/${session.id}/complete`,
        { method: 'POST' }
      );

      setLatestResults({
        ...completion,
        sessionType: session.type as SessionTypeEnum,
      });
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
            answer: normaliseAnswerForQuestion(
              question,
              result.userAnswer.answer as AnswerValue
            ),
            answered: true,
            result,
          };
        });
        questionsRef.current = next;
        return next;
      });
      syncActiveSessionQuestions();
      await refreshSessionSnapshot(session.id);

      return completion;
    } catch (err) {
      console.error('Failed to complete questions', err);
      setError(err instanceof Error ? err.message : 'Failed to complete questions');
      return null;
    } finally {
      isCompletingRef.current = false;
      setIsSubmitting(false);
    }
  }, [forceSave, refreshSessionSnapshot, syncActiveSessionQuestions, latestResults]);

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

  const getSupportedModules = useCallback((): QuestionModuleId[] => {
    if (!activeSession) {
      return [];
    }
    return getSupportedModulesFromRegistry(activeSession.type as SessionTypeEnum);
  }, [activeSession]);

  const sessionProgress = useMemo(() => {
    if (activeSession?.data?.progress) {
      return activeSession.data.progress;
    }
    if (sessionQuestions.length) {
      return deriveProgressSummary(sessionQuestions);
    }
    return null;
  }, [activeSession?.data?.progress, sessionQuestions]);

  const sessionMetrics = useMemo(() => {
    if (activeSession?.data?.metrics) {
      return activeSession.data.metrics;
    }
    return {};
  }, [activeSession?.data?.metrics]);

  const value = useMemo<LearningSessionContextValue>(
    () => ({
      activeSession,
      sessionQuestions,
      currentQuestion,
      questionProgress,
      generationState,
      isGeneratingQuestions,
      sessionProgress,
      sessionMetrics,
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
      getSupportedModules,
    }),
    [
      activeSession,
      sessionQuestions,
      currentQuestion,
      questionProgress,
      sessionProgress,
      sessionMetrics,
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
      getSupportedModules,
      generationState,
      isGeneratingQuestions,
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
function normaliseAnswerForQuestion(
  question: Question,
  value: AnswerValue | null | undefined
): AnswerValue | null {
  if (value === undefined) {
    return null;
  }

  const moduleId = (question.moduleId ??
    question.registryType ??
    QuestionModuleId.MULTIPLE_CHOICE) as QuestionModuleId;

  if (moduleId === QuestionModuleId.STATEMENT_MATCH) {
    return normaliseStatementMatchAnswer(question, value);
  }

  if (question.gaps && question.gaps.length > 0) {
    return normaliseGapAnswerValue(question, value);
  }

  if (moduleId === QuestionModuleId.WRITTEN_RESPONSE || question.inputType === 'long_text') {
    return typeof value === 'string' ? value : defaultNormaliseAnswer(value);
  }

  if (moduleId === QuestionModuleId.MULTIPLE_CHOICE || question.inputType === 'multiple_choice') {
    return normaliseSingleSelection(value);
  }

  return defaultNormaliseAnswer(value);
}
