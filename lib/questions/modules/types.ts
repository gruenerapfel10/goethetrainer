import type { SessionTypeEnum } from '@/lib/sessions/session-registry';
import type {
  QuestionDifficulty,
  Question,
  QuestionResult,
  UserAnswer,
} from '@/lib/sessions/questions/question-types';

export enum QuestionModuleId {
  MULTIPLE_CHOICE = 'multiple_choice',
  WRITTEN_RESPONSE = 'written_response',
  TRUE_FALSE = 'true_false',
  STATEMENT_MATCH = 'statement_match',
  AUDIO_RESPONSE = 'audio_response',
  // Future modules can be appended here.
}

export interface ScoringPartialCreditConfig {
  mode: 'per_item' | 'threshold' | 'rubric';
  penalties?: {
    incorrectSelection?: number;
    missingSelection?: number;
  };
}

export interface ScoringPolicy {
  maxPoints: number;
  strategy:
    | 'single_select'
    | 'multi_select'
    | 'per_gap'
    | 'rubric'
    | 'ai';
  unitWeights?: number[] | Record<string, number>;
  partialCredit?: ScoringPartialCreditConfig;
  aiConfig?: {
    modelId: string;
    rubric?: Array<{
      criterion: string;
      weight: number;
      description?: string;
    }>;
  };
}

export interface QuestionModulePromptConfig {
  instructions?: string;
  [key: string]: unknown;
}

export interface QuestionModuleRenderConfig {
  layout?:
    | 'horizontal'
    | 'vertical'
    | 'single_column'
    | 'grid'
    | 'statement_match'
    | 'single_statement'
    | 'writing';
  showSourceToggle?: boolean;
  showAudioControls?: boolean;
  [key: string]: unknown;
}

export interface QuestionModuleSourceConfig {
  type?: string;
  [key: string]: unknown;
}

export interface QuestionModuleDefaults<
  P extends QuestionModulePromptConfig,
  R extends QuestionModuleRenderConfig,
  S extends QuestionModuleSourceConfig
> {
  prompt: P;
  render: R;
  source: S;
  scoring: ScoringPolicy;
}

export interface QuestionModuleGenerateContext<
  P extends QuestionModulePromptConfig,
  S extends QuestionModuleSourceConfig
> {
  sessionType: SessionTypeEnum;
  difficulty: QuestionDifficulty;
  questionCount: number;
  promptConfig: P;
  sourceConfig: S;
}

export interface QuestionModuleGenerateResult {
  questions: Question[];
  metadata?: Record<string, unknown>;
}

export interface QuestionModuleMarkContext<TAnswer = unknown> {
  question: Question;
  answer: TAnswer | null;
  userAnswer: UserAnswer;
}

export interface QuestionModuleMarkResult extends QuestionResult {
  breakdown?: Record<string, unknown>;
}

export interface QuestionModule<
  P extends QuestionModulePromptConfig = QuestionModulePromptConfig,
  R extends QuestionModuleRenderConfig = QuestionModuleRenderConfig,
  S extends QuestionModuleSourceConfig = QuestionModuleSourceConfig,
  TAnswer = unknown
> {
  id: QuestionModuleId;
  label: string;
  description?: string;
  supportsSessions: SessionTypeEnum[];
  defaults: QuestionModuleDefaults<P, R, S>;
  generate(
    context: QuestionModuleGenerateContext<P, S>
  ): Promise<QuestionModuleGenerateResult>;
  normaliseAnswer(value: unknown, question: Question): TAnswer | null;
  mark(context: QuestionModuleMarkContext<TAnswer>): Promise<QuestionModuleMarkResult>;
  // Arbitrary metadata hooks for client renderers.
  clientRenderKey: string;
}

export interface QuestionModuleTask<
  P extends QuestionModulePromptConfig = QuestionModulePromptConfig,
  R extends QuestionModuleRenderConfig = QuestionModuleRenderConfig,
  S extends QuestionModuleSourceConfig = QuestionModuleSourceConfig
> {
  id: string;
  label?: string;
  moduleId: QuestionModuleId;
  questionCount: number;
  promptOverrides?: Partial<P>;
  renderOverrides?: Partial<R>;
  sourceOverrides?: Partial<S>;
  scoringOverrides?: Partial<ScoringPolicy>;
  metadata?: Record<string, unknown>;
}
