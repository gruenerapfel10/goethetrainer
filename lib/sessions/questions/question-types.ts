import { SessionTypeEnum } from '../session-registry';
import { QuestionInputType } from '../inputs/types';
import type { ReadingAssessmentCategory } from '@/lib/questions/assessment-categories';

/**
 * Centralized question type definitions
 */

export enum QuestionType {
  // Reading question types
  READING_COMPREHENSION = 'reading_comprehension',
  READING_VOCABULARY = 'reading_vocabulary',
  READING_GRAMMAR = 'reading_grammar',
  
  // Listening question types  
  LISTENING_COMPREHENSION = 'listening_comprehension',
  LISTENING_DETAIL = 'listening_detail',
  LISTENING_INFERENCE = 'listening_inference',
  
  // Writing question types
  WRITING_PROMPT = 'writing_prompt',
  WRITING_GRAMMAR = 'writing_grammar',
  WRITING_TRANSLATION = 'writing_translation',
  
  // Speaking question types
  SPEAKING_PROMPT = 'speaking_prompt',
  SPEAKING_PRONUNCIATION = 'speaking_pronunciation',
  SPEAKING_CONVERSATION = 'speaking_conversation',
}

export enum QuestionDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface AudioPlaybackPolicy {
  maxPlays?: number;
  allowPause?: boolean;
  allowSeek?: boolean;
  allowScrubbing?: boolean;
  allowRestart?: boolean;
  allowSpeedChange?: boolean;
}

export interface AudioSourceSegment {
  timestamp: string;
  summary: string;
}

export interface AudioDialogueSegment {
  speakerId: string;
  speakerName?: string;
  role?: string;
  text: string;
}

export interface GeneratedAudioDefinition {
  provider: 'web_speech';
  locale?: string;
  voiceHint?: string;
  rate?: number;
  pitch?: number;
  segments: AudioDialogueSegment[];
}

export interface AudioSourceDefinition {
  id?: string;
  title?: string;
  description?: string;
  url: string;
  durationSeconds?: number;
  transcript?: string;
  transcriptLanguage?: string;
  segments?: AudioSourceSegment[];
  status?: 'ready' | 'processing' | 'pending' | 'error';
  playback?: AudioPlaybackPolicy;
  dialogue?: AudioDialogueSegment[];
  generatedAudio?: GeneratedAudioDefinition;
}

export interface QuestionSourceReference {
  title?: string;
  summary?: string;
  url?: string;
  provider?: string;
  publishedAt?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  sessionType: SessionTypeEnum;
  difficulty: QuestionDifficulty;
  inputType: QuestionInputType;
  /** @deprecated use inputType to determine rendering/marking */
  answerType?: QuestionInputType;
  
  // Module reference
  registryType?: string; // Legacy reference
  moduleId?: string;
  moduleLabel?: string;
  
  // Question content
  prompt: string;
  text?: string;
  context?: string; // For reading/listening passages
  options?: QuestionOption[]; // For multiple choice
  correctAnswer?: string | string[]; // For validation
  correctOptionId?: string; // Alternative to correctAnswer for multiple choice

  // Goethe C1 Reading specific fields
  title?: string; // Article title (e.g., "JUNGE UNTERNEHMEN DER TOURISMUSBRANCHE")
  subtitle?: string; // Article subtitle (e.g., "StadtTours")
  heading?: string; // Article heading/introduction
  instructions?: string; // Task instructions
  workingTime?: string; // Suggested working time (e.g., "10 Minuten")
  theme?: string;
  audioSource?: AudioSourceDefinition;
  auxiliaryAudioSources?: AudioSourceDefinition[];

  // Goethe C1 specific fields
  gaps?: Array<{
    id: string;
    options?: Array<{ id: string; text: string }>;
    correctAnswer?: string;
    correctOptionId?: string; // Alternative to correctAnswer for multiple choice gaps
    assessmentCategory?: ReadingAssessmentCategory;
    optionRationales?: Array<{
      optionId: string;
      rationale: string;
      isCorrect: boolean;
      misconception?: string;
    }>;
  }>; // For GAP_TEXT_GAP_TEXT_MULTIPLE_CHOICE and GAP_TEXT_MATCHING
  
  sentences?: Array<{
    id: string;
    text: string;
  }>; // For GAP_TEXT_MATCHING
  
  texts?: Array<{
    id: string;
    label: string;
    content: string;
    role?: string;
  }>; // For STATEMENT_MATCHING
  
  statements?: Array<{
    id: string;
    text: string;
    number?: number;
  }>; // For STATEMENT_MATCHING
  
  correctMatches?: Record<string, string>; // For GAP_TEXT_MATCHING and STATEMENT_MATCHING

  writingPrompt?: {
    scenario?: string;
    goal?: string;
    audience?: string;
    tone?: string;
    tasks?: string[];
  };

  wordGuide?: {
    min: number;
    target?: number;
    max?: number;
  };

  scoringRubric?: Array<{
    id: string;
    label: string;
    description?: string;
    maxPoints: number;
    guidance?: string;
  }>;

  markingGuidelines?: string[];

  sourceSections?: Array<{
    title?: string;
    body: string;
  }>;

  sourceReference?: QuestionSourceReference;
  assessmentCategory?: ReadingAssessmentCategory;
  optionRationales?: Array<{
    optionId: string;
    rationale: string;
    isCorrect: boolean;
    misconception?: string;
  }>;
  
  // Metadata
  points: number;
  timeLimit?: number; // in seconds
  hints?: string[];
  explanation?: string;

  // Example question flag
  isExample?: boolean; // If true, this is a pre-filled example question
  exampleAnswer?: string; // Pre-filled answer for example questions
  
  // Scoring
  scoringCriteria?: {
    requireExactMatch?: boolean;
    acceptPartialCredit?: boolean;
    keywords?: string[]; // For AI marking
    rubric?: Record<string, number>; // Scoring rubric
  };

  // Session orchestration metadata
  teil?: number;
  order?: number;
  answered?: boolean;
  answer?: string | string[] | boolean | Record<string, string> | null;
  lastSubmittedAt?: string;
  layoutVariant?: string;
  layoutId?: string;
  layoutLabel?: string;
  presentation?: Record<string, unknown>;
  renderConfig?: Record<string, unknown>;
  scoring?: Record<string, unknown>;
}

export interface UserAnswer {
  questionId: string;
  answer: string | string[] | boolean | Record<string, string> | null;
  timeSpent: number; // in seconds
  attempts: number;
  hintsUsed: number;
  timestamp: Date;
}

export interface QuestionResult {
  questionId: string;
  question: Question;
  userAnswer: UserAnswer;
  score: number;
  maxScore: number;
  isCorrect: boolean;
  feedback?: string;
  markedBy: 'manual' | 'ai' | 'automatic';
  breakdown?: {
    summary?: string;
    nextStep?: string;
    detectedWordCount?: number;
    criteria?: Array<{
      id: string;
      label?: string;
      awardedPoints: number;
      maxPoints: number;
      reasoning?: string;
      decisions?: Array<{
        markNumber: number;
        outcome: 'award' | 'reject';
        source: string;
        justification: string;
      }>;
    }>;
  };
}

// Backwards compatible alias while legacy code migrates.
export { QuestionInputType as AnswerType };
export { QuestionInputType } from '../inputs/types';
