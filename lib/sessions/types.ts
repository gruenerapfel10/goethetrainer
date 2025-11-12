import type {
  Question as SessionQuestion,
  QuestionResult as SessionQuestionResult,
  UserAnswer,
} from './questions/question-types';
import type { QuestionSessionSummary } from './question-manager';
import type { LevelId } from '@/lib/levels';

export interface SessionGenerationState {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  total: number;
  generated: number;
  currentTeil?: number | null;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  lastGeneratedQuestionId?: string;
}

// Centralized type definitions for session flow
export type SessionType = 'reading' | 'listening' | 'writing' | 'speaking';
export type SessionStatus = 'active' | 'completed' | 'abandoned' | 'paused';

export interface SessionData {
  questions: SessionQuestion[];
  answers: UserAnswer[];
  results: SessionQuestionResult[];
  resultsSummary?: QuestionSessionSummary | null;
  resultsGeneratedAt?: string;
  progress?: {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    score: number;
    maxScore: number;
  };
  metrics?: Record<string, number>;
  activity?: Array<{
    type: string;
    timestamp: string;
    payload?: Record<string, unknown>;
  }>;
  generation?: SessionGenerationState | null;
  state?: {
    activeTeil: number | null;
    activeQuestionId: string | null;
    activeView: 'fragen' | 'quelle' | 'overview';
  };
  [key: string]: any;
}

export interface SessionMetadata {
  [key: string]: any;
  levelId?: LevelId;
}

export interface Session {
  id: string;
  userId: string;
  type: SessionType;
  startedAt: Date;
  endedAt?: Date | null;
  status?: SessionStatus;
  duration?: number; // seconds
  metadata?: SessionMetadata;
  data: SessionData;
}

export interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  totalDuration: number;
  averageDuration?: number;
  lastSessionDate?: Date | string;
  streakDays?: number;
  sessionsByType?: Record<string, number>;
}

export type SessionAnalytics = Record<
  SessionType,
  {
    count: number;
    totalDuration: number;
    averageDuration: number;
    completionRate: number;
  }
>;

// Backwards compatible re-exports
export type Question = SessionQuestion;
export type QuestionResult = SessionQuestionResult;
export type AnswerValue = UserAnswer['answer'] | null;

export interface TeilBreakdownEntry {
  teilNumber: number;
  label: string;
  questionCount: number;
  correctAnswers: number;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface ModuleBreakdownEntry {
  module: SessionType;
  label: string;
  rawScore: number;
  rawMaxScore: number;
  scaledScore: number;
  scaledMaxScore: number;
  percentage: number;
  questionCount: number;
}

export interface UpdateSessionInput {
  data?: Partial<SessionData>;
  metadata?: Partial<SessionMetadata>;
  status?: SessionStatus;
  duration?: number;
  answers?: Record<string, AnswerValue>;
}

export interface SubmitAnswerPayload {
  questionId: string;
  answer: AnswerValue;
  timeSpent: number;
  hintsUsed: number;
}

export interface CompletionSummary {
  results: QuestionResult[];
  summary: {
    totalQuestions: number;
    answeredQuestions: number;
    incorrectAnswers: number;
    correctAnswers: number;
    totalScore: number;
    maxScore: number;
    percentage: number;
    pendingManualReview: number;
    teilBreakdown: TeilBreakdownEntry[];
    moduleBreakdown: ModuleBreakdownEntry[];
  };
}
