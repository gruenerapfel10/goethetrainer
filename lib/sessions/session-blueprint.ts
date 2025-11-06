import type {
  Question,
  QuestionResult,
  UserAnswer,
} from './questions/question-types';

export interface StandardSessionData {
  questions: Question[];
  answers: UserAnswer[];
  results: QuestionResult[];
  progress: {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    score: number;
    maxScore: number;
  };
  metrics: Record<string, number>;
  activity: Array<{
    type: string;
    timestamp: string;
    payload?: Record<string, unknown>;
  }>;
  state: {
    activeTeil: number | null;
    activeQuestionId: string | null;
    activeView: 'fragen' | 'quelle' | 'overview';
  };
}

export function createStandardSessionData(): StandardSessionData {
  return {
    questions: [],
    answers: [],
    results: [],
    progress: {
      totalQuestions: 0,
      answeredQuestions: 0,
      correctAnswers: 0,
      score: 0,
      maxScore: 0,
    },
    metrics: {},
    activity: [],
    state: {
      activeTeil: null,
      activeQuestionId: null,
      activeView: 'fragen',
    },
  };
}

export function mergeSessionDataDefaults<T extends Record<string, any>>(
  overrides?: T,
): StandardSessionData & T {
  const base = createStandardSessionData();
  return {
    ...base,
    ...(overrides ?? ({} as T)),
    progress: {
      ...base.progress,
      ...(overrides?.progress ?? {}),
    },
    metrics: {
      ...base.metrics,
      ...(overrides?.metrics ?? {}),
    },
    activity: Array.isArray(overrides?.activity) ? overrides.activity : base.activity,
    state: {
      ...base.state,
      ...(overrides?.state ?? {}),
    },
  };
}

export function ensureStandardSessionData(
  data: Record<string, any> | null | undefined,
): StandardSessionData & Record<string, any> {
  const base = createStandardSessionData();
  const safe = data ?? {};

  safe.questions = Array.isArray(safe.questions) ? safe.questions : [];
  safe.answers = Array.isArray(safe.answers) ? safe.answers : [];
  safe.results = Array.isArray(safe.results) ? safe.results : [];

  safe.progress = {
    ...base.progress,
    ...(typeof safe.progress === 'object' && safe.progress !== null ? safe.progress : {}),
  };

  safe.metrics = {
    ...base.metrics,
    ...(typeof safe.metrics === 'object' && safe.metrics !== null ? safe.metrics : {}),
  };

  safe.activity = Array.isArray(safe.activity) ? safe.activity : base.activity;

  safe.state = {
    ...base.state,
    ...(typeof safe.state === 'object' && safe.state !== null ? safe.state : {}),
  };

  return safe as StandardSessionData & Record<string, any>;
}
