import { SessionTypeEnum } from '../session-registry';
import { QuestionInputType } from '../inputs/types';

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

  // Goethe C1 specific fields
  gaps?: Array<{
    id: string;
    options?: string[];
    correctAnswer?: string;
    correctOptionId?: string; // Alternative to correctAnswer for multiple choice gaps
  }>; // For GAP_TEXT_GAP_TEXT_MULTIPLE_CHOICE and GAP_TEXT_MATCHING
  
  sentences?: Array<{
    id: string;
    text: string;
  }>; // For GAP_TEXT_MATCHING
  
  texts?: Array<{
    id: string;
    label: string;
    content: string;
  }>; // For STATEMENT_MATCHING
  
  statements?: Array<{
    id: string;
    text: string;
  }>; // For STATEMENT_MATCHING
  
  correctMatches?: Record<string, string>; // For GAP_TEXT_MATCHING and STATEMENT_MATCHING
  
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
}

// Backwards compatible alias while legacy code migrates.
export { QuestionInputType as AnswerType };
export { QuestionInputType } from '../inputs/types';
