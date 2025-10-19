import { SessionTypeEnum } from '../session-registry';

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

export enum AnswerType {
  MULTIPLE_CHOICE = 'multiple_choice',
  SHORT_ANSWER = 'short_answer',
  LONG_ANSWER = 'long_answer',
  AUDIO_RECORDING = 'audio_recording',
  TRUE_FALSE = 'true_false',
  MATCHING = 'matching',
  FILL_BLANK = 'fill_blank',
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
  answerType: AnswerType;
  
  // Registry type reference
  registryType?: string; // References QuestionTypeName from registry
  
  // Question content
  prompt: string;
  context?: string; // For reading/listening passages
  options?: QuestionOption[]; // For multiple choice
  correctAnswer?: string | string[]; // For validation
  
  // Metadata
  points: number;
  timeLimit?: number; // in seconds
  hints?: string[];
  explanation?: string;
  
  // Scoring
  scoringCriteria?: {
    requireExactMatch?: boolean;
    acceptPartialCredit?: boolean;
    keywords?: string[]; // For AI marking
    rubric?: Record<string, number>; // Scoring rubric
  };
}

export interface UserAnswer {
  questionId: string;
  answer: string | string[] | boolean;
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