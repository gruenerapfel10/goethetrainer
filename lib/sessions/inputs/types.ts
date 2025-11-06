import { z } from 'zod';
import type {
  Question,
  QuestionResult,
  UserAnswer,
} from '../questions/question-types';

/**
 * Core input types that describe how a learner interacts with a question.
 * A single question type (e.g. Goethe gap text) can reference one of these
 * inputs to inherit rendering, persistence, and marking behaviour.
 */
export enum QuestionInputType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_TEXT = 'short_text',
  LONG_TEXT = 'long_text',
  MATCHING = 'matching',
  AUDIO_RECORDING = 'audio_recording',
  COMPOSITE = 'composite',
}

export type QuestionInputCategory =
  | 'selection'
  | 'boolean'
  | 'written'
  | 'audio'
  | 'matching'
  | 'composite'
  | string;

export interface QuestionInputComponentConfig {
  /**
   * Identifier consumed by the UI layer to resolve the concrete React component.
   * Typically matches the folder or file name under components/inputs.
   */
  component: string;
  /**
   * Arbitrary serialisable props forwarded to the component factory.
   */
  props?: Record<string, unknown>;
}

export interface MarkAnswerContext<TAnswer = unknown> {
  question: Question;
  answer: TAnswer | null;
  userAnswer: UserAnswer;
  previousResult?: QuestionResult | null;
}

export type MarkingStrategy = 'automatic' | 'manual' | 'ai_assisted';

export interface QuestionInputMarking<TAnswer = unknown> {
  strategy: MarkingStrategy;
  /**
   * Optional marker implementation. When omitted, the orchestrator must provide
   * a default strategy (e.g. manual review queue).
   */
  mark?: (context: MarkAnswerContext<TAnswer>) => Promise<QuestionResult>;
}

export interface QuestionInputDefinition<TAnswer = unknown> {
  id: QuestionInputType;
  label: string;
  description?: string;
  category: QuestionInputCategory;
  /**
   * Zod schema describing the canonical answer payload.
   */
  answerSchema: z.ZodType<TAnswer>;
  /**
   * Produce an initial answer state for new attempts.
   */
  createInitialValue?: (question: Question) => TAnswer | null;
  /**
   * Normalise raw user input before persistence/marking.
   */
  normalise?: (value: unknown, question: Question) => TAnswer | null;
  /**
   * Serialisation hooks allow inputs to own their persistence format.
   */
  toPersist?: (value: TAnswer | null, question: Question) => unknown;
  fromPersist?: (value: unknown, question: Question) => TAnswer | null;
  /**
   * Declarative UI contract consumed by the client renderer.
   */
  ui: QuestionInputComponentConfig;
  /**
   * Marking behaviour. Automatic inputs should provide a marker implementation.
   */
  marking: QuestionInputMarking<TAnswer>;
  /**
   * Arbitrary metadata available to orchestrators (e.g. supportsHints, timers).
   */
  metadata?: Record<string, unknown>;
}

export type RegisteredQuestionInputDefinition = QuestionInputDefinition<any>;
