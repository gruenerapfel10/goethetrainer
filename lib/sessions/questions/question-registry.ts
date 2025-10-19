import { z } from 'zod';
import { SessionTypeEnum } from '../session-registry';

export enum QuestionTypeName {
  // Reading question types (Goethe C1 compliant)
  GAP_TEXT_MULTIPLE_CHOICE = 'gap_text_multiple_choice', // Lückentext mit Multiple-Choice
  MULTIPLE_CHOICE_3 = 'multiple_choice_3', // Multiple-Choice (3-gliedrig)
  GAP_TEXT_MATCHING = 'gap_text_matching', // Lückentext mit Zuordnung
  STATEMENT_MATCHING = 'statement_matching', // Zuordnung von Aussagen
  
  // Legacy question types (kept for backward compatibility)
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  FILL_IN_BLANK = 'fill_in_blank',
  
  // Writing question types
  ESSAY = 'essay',
  TRANSLATION = 'translation',
  SENTENCE_CORRECTION = 'sentence_correction',
  
  // Listening question types
  AUDIO_COMPREHENSION = 'audio_comprehension',
  DICTATION = 'dictation',
  
  // Speaking question types
  PRONUNCIATION = 'pronunciation',
  CONVERSATION = 'conversation',
  ORAL_PRESENTATION = 'oral_presentation',
}

// Marking method for questions
export enum MarkingMethod {
  MANUAL = 'manual', // Teacher/human marks manually
  AUTOMATIC = 'automatic', // System marks automatically (e.g., multiple choice)
  AI_ASSISTED = 'ai_assisted', // AI marks with criteria
}

// Base metadata for all question types
export interface QuestionMetadata {
  name: QuestionTypeName;
  displayName: string;
  description: string;
  category: 'selection' | 'written' | 'audio' | 'spoken';
  
  // Which session types support this question
  supportedSessions: SessionTypeEnum[];
  
  // Marking configuration
  markingMethod: MarkingMethod;
  markingSchema?: z.ZodSchema; // Schema for AI marking (null = manual)
  
  // Generation schema for AI to create questions
  generationSchema: z.ZodSchema;
  
  // Answer schema for validation
  answerSchema: z.ZodSchema;
  
  // UI preferences
  requiresRichTextEditor?: boolean;
  requiresAudioRecorder?: boolean;
  requiresTimer?: boolean;
  supportsHints?: boolean;
  supportsPartialCredit?: boolean;
  
  // Scoring configuration
  defaultPoints?: number;
  defaultTimeLimit?: number; // in seconds
}

// Schema for multiple choice options
const MultipleChoiceOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean().optional(),
});

// Generation schema for multiple choice questions
const MultipleChoiceGenerationSchema = z.object({
  prompt: z.string().describe('The question prompt text'),
  context: z.string().optional().describe('Additional context or passage for the question'),
  options: z.array(MultipleChoiceOptionSchema).min(2).max(6).describe('Answer options'),
  correctOptionId: z.string().describe('ID of the correct option'),
  explanation: z.string().describe('Explanation of why the answer is correct'),
  hints: z.array(z.string()).optional().describe('Progressive hints for the question'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  points: z.number().default(10),
  timeLimit: z.number().optional().describe('Time limit in seconds'),
});

// Answer schema for multiple choice
const MultipleChoiceAnswerSchema = z.object({
  selectedOptionId: z.string(),
  timeSpent: z.number().optional(),
  hintsUsed: z.number().default(0),
});

// Marking schema for multiple choice (automatic)
const MultipleChoiceMarkingSchema = z.object({
  selectedOptionId: z.string(),
  correctOptionId: z.string(),
  points: z.number(),
});

// Complete registry of all question types
export const QUESTION_METADATA: Record<QuestionTypeName, QuestionMetadata> = {
  // Goethe C1 Reading Question Types
  [QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE]: {
    name: QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE,
    displayName: 'Gap Text with Multiple Choice',
    description: 'Fill gaps in text by selecting from 4 options',
    category: 'selection',
    supportedSessions: [SessionTypeEnum.READING],
    markingMethod: MarkingMethod.AUTOMATIC,
    markingSchema: z.object({
      selectedOptions: z.array(z.string()),
      correctOptions: z.array(z.string()),
      points: z.number(),
    }),
    generationSchema: z.object({
      text: z.string().describe('Text with [GAP_1], [GAP_2] markers'),
      gaps: z.array(z.object({
        id: z.string(),
        options: z.array(z.object({
          id: z.string(),
          text: z.string(),
        })).length(4),
        correctOptionId: z.string(),
      })),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(8),
    }),
    answerSchema: z.object({
      selectedOptions: z.record(z.string(), z.string()),
      timeSpent: z.number().optional(),
    }),
    supportsHints: false,
    supportsPartialCredit: true,
    defaultPoints: 8,
    defaultTimeLimit: 600,
  },

  [QuestionTypeName.MULTIPLE_CHOICE_3]: {
    name: QuestionTypeName.MULTIPLE_CHOICE_3,
    displayName: 'Multiple Choice (3 Options)',
    description: 'Select the correct answer from 3 options',
    category: 'selection',
    supportedSessions: [SessionTypeEnum.READING],
    markingMethod: MarkingMethod.AUTOMATIC,
    markingSchema: z.object({
      selectedOptionId: z.string(),
      correctOptionId: z.string(),
      points: z.number(),
    }),
    generationSchema: z.object({
      prompt: z.string().describe('The question prompt text'),
      context: z.string().describe('Reading passage or context'),
      options: z.array(z.object({
        id: z.string(),
        text: z.string(),
        isCorrect: z.boolean().optional(),
      })).length(3),
      correctOptionId: z.string(),
      explanation: z.string(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(7),
    }),
    answerSchema: z.object({
      selectedOptionId: z.string(),
      timeSpent: z.number().optional(),
    }),
    supportsHints: false,
    supportsPartialCredit: false,
    defaultPoints: 7,
    defaultTimeLimit: 300,
  },

  [QuestionTypeName.GAP_TEXT_MATCHING]: {
    name: QuestionTypeName.GAP_TEXT_MATCHING,
    displayName: 'Gap Text with Sentence Matching',
    description: 'Match sentences to gaps in the text',
    category: 'selection',
    supportedSessions: [SessionTypeEnum.READING],
    markingMethod: MarkingMethod.AUTOMATIC,
    markingSchema: z.object({
      matches: z.record(z.string(), z.string()),
      correctMatches: z.record(z.string(), z.string()),
      points: z.number(),
    }),
    generationSchema: z.object({
      text: z.string().describe('Text with numbered gaps'),
      sentences: z.array(z.object({
        id: z.string(),
        text: z.string(),
        correctGapId: z.string().optional(),
      })).min(8).max(10),
      gaps: z.array(z.object({
        id: z.string(),
        correctSentenceId: z.string(),
      })),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(8),
    }),
    answerSchema: z.object({
      matches: z.record(z.string(), z.string()),
      timeSpent: z.number().optional(),
    }),
    supportsHints: false,
    supportsPartialCredit: true,
    defaultPoints: 8,
    defaultTimeLimit: 900,
  },

  [QuestionTypeName.STATEMENT_MATCHING]: {
    name: QuestionTypeName.STATEMENT_MATCHING,
    displayName: 'Statement Matching',
    description: 'Match statements to different texts or authors',
    category: 'selection',
    supportedSessions: [SessionTypeEnum.READING],
    markingMethod: MarkingMethod.AUTOMATIC,
    markingSchema: z.object({
      matches: z.record(z.string(), z.string()),
      correctMatches: z.record(z.string(), z.string()),
      points: z.number(),
    }),
    generationSchema: z.object({
      texts: z.array(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
      })).min(2).max(4),
      statements: z.array(z.object({
        id: z.string(),
        text: z.string(),
        correctTextId: z.string().nullable(),
      })).min(5).max(10),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(7),
    }),
    answerSchema: z.object({
      matches: z.record(z.string(), z.string().nullable()),
      timeSpent: z.number().optional(),
    }),
    supportsHints: false,
    supportsPartialCredit: true,
    defaultPoints: 7,
    defaultTimeLimit: 750,
  },

  // Legacy question types (kept for backward compatibility)
  [QuestionTypeName.MULTIPLE_CHOICE]: {
    name: QuestionTypeName.MULTIPLE_CHOICE,
    displayName: 'Multiple Choice',
    description: 'Select the correct answer from given options',
    category: 'selection',
    supportedSessions: [
      SessionTypeEnum.READING,
      SessionTypeEnum.LISTENING,
    ],
    markingMethod: MarkingMethod.AUTOMATIC,
    markingSchema: MultipleChoiceMarkingSchema,
    generationSchema: MultipleChoiceGenerationSchema,
    answerSchema: MultipleChoiceAnswerSchema,
    supportsHints: true,
    supportsPartialCredit: false,
    defaultPoints: 10,
    defaultTimeLimit: 60,
  },
  
  [QuestionTypeName.TRUE_FALSE]: {
    name: QuestionTypeName.TRUE_FALSE,
    displayName: 'True or False',
    description: 'Determine if the statement is true or false',
    category: 'selection',
    supportedSessions: [
      SessionTypeEnum.READING,
      SessionTypeEnum.LISTENING,
    ],
    markingMethod: MarkingMethod.AUTOMATIC,
    markingSchema: z.object({
      answer: z.boolean(),
      correctAnswer: z.boolean(),
      points: z.number(),
    }),
    generationSchema: z.object({
      statement: z.string(),
      context: z.string().optional(),
      correctAnswer: z.boolean(),
      explanation: z.string(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(5),
    }),
    answerSchema: z.object({
      answer: z.boolean(),
      timeSpent: z.number().optional(),
    }),
    supportsHints: false,
    supportsPartialCredit: false,
    defaultPoints: 5,
    defaultTimeLimit: 30,
  },
  
  [QuestionTypeName.SHORT_ANSWER]: {
    name: QuestionTypeName.SHORT_ANSWER,
    displayName: 'Short Answer',
    description: 'Provide a brief written response',
    category: 'written',
    supportedSessions: [
      SessionTypeEnum.READING,
      SessionTypeEnum.WRITING,
    ],
    markingMethod: MarkingMethod.AI_ASSISTED,
    markingSchema: z.object({
      answer: z.string(),
      rubric: z.object({
        keywords: z.array(z.string()),
        maxLength: z.number().optional(),
        grammarWeight: z.number().default(0.3),
        contentWeight: z.number().default(0.7),
      }),
      maxPoints: z.number(),
    }),
    generationSchema: z.object({
      prompt: z.string(),
      context: z.string().optional(),
      expectedAnswer: z.string(),
      keywords: z.array(z.string()),
      maxLength: z.number().default(150),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(15),
    }),
    answerSchema: z.object({
      answer: z.string().max(500),
      timeSpent: z.number().optional(),
    }),
    requiresRichTextEditor: false,
    supportsHints: true,
    supportsPartialCredit: true,
    defaultPoints: 15,
    defaultTimeLimit: 120,
  },
  
  [QuestionTypeName.FILL_IN_BLANK]: {
    name: QuestionTypeName.FILL_IN_BLANK,
    displayName: 'Fill in the Blank',
    description: 'Complete the sentence with the correct word(s)',
    category: 'written',
    supportedSessions: [
      SessionTypeEnum.READING,
      SessionTypeEnum.WRITING,
    ],
    markingMethod: MarkingMethod.AUTOMATIC,
    markingSchema: z.object({
      answers: z.array(z.string()),
      correctAnswers: z.array(z.string()),
      acceptableVariations: z.array(z.array(z.string())).optional(),
      points: z.number(),
    }),
    generationSchema: z.object({
      sentence: z.string().describe('Sentence with [BLANK] markers'),
      correctAnswers: z.array(z.string()),
      acceptableVariations: z.array(z.array(z.string())).optional(),
      context: z.string().optional(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(10),
    }),
    answerSchema: z.object({
      answers: z.array(z.string()),
      timeSpent: z.number().optional(),
    }),
    supportsHints: true,
    supportsPartialCredit: true,
    defaultPoints: 10,
    defaultTimeLimit: 90,
  },
  
  [QuestionTypeName.ESSAY]: {
    name: QuestionTypeName.ESSAY,
    displayName: 'Essay',
    description: 'Write a detailed essay response',
    category: 'written',
    supportedSessions: [SessionTypeEnum.WRITING],
    markingMethod: MarkingMethod.AI_ASSISTED,
    markingSchema: z.object({
      essay: z.string(),
      rubric: z.object({
        structure: z.number().min(0).max(1),
        content: z.number().min(0).max(1),
        grammar: z.number().min(0).max(1),
        vocabulary: z.number().min(0).max(1),
        coherence: z.number().min(0).max(1),
      }),
      maxPoints: z.number(),
      minWords: z.number(),
      maxWords: z.number(),
    }),
    generationSchema: z.object({
      prompt: z.string(),
      topic: z.string(),
      minWords: z.number().default(150),
      maxWords: z.number().default(500),
      rubricCriteria: z.array(z.string()),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(30),
    }),
    answerSchema: z.object({
      essay: z.string().min(50).max(2000),
      wordCount: z.number(),
      timeSpent: z.number().optional(),
    }),
    requiresRichTextEditor: true,
    supportsHints: false,
    supportsPartialCredit: true,
    defaultPoints: 30,
    defaultTimeLimit: 1800, // 30 minutes
  },
  
  [QuestionTypeName.TRANSLATION]: {
    name: QuestionTypeName.TRANSLATION,
    displayName: 'Translation',
    description: 'Translate text between languages',
    category: 'written',
    supportedSessions: [SessionTypeEnum.WRITING],
    markingMethod: MarkingMethod.AI_ASSISTED,
    markingSchema: z.object({
      translation: z.string(),
      sourceText: z.string(),
      targetLanguage: z.string(),
      accuracy: z.number().min(0).max(1),
      fluency: z.number().min(0).max(1),
      maxPoints: z.number(),
    }),
    generationSchema: z.object({
      sourceText: z.string(),
      sourceLanguage: z.string(),
      targetLanguage: z.string(),
      expectedTranslation: z.string(),
      acceptableVariations: z.array(z.string()).optional(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(20),
    }),
    answerSchema: z.object({
      translation: z.string(),
      timeSpent: z.number().optional(),
    }),
    requiresRichTextEditor: false,
    supportsHints: false,
    supportsPartialCredit: true,
    defaultPoints: 20,
    defaultTimeLimit: 300,
  },
  
  [QuestionTypeName.SENTENCE_CORRECTION]: {
    name: QuestionTypeName.SENTENCE_CORRECTION,
    displayName: 'Sentence Correction',
    description: 'Correct grammatical errors in sentences',
    category: 'written',
    supportedSessions: [SessionTypeEnum.WRITING],
    markingMethod: MarkingMethod.AI_ASSISTED,
    markingSchema: z.object({
      correctedSentence: z.string(),
      originalSentence: z.string(),
      errorsIdentified: z.array(z.string()),
      correctionsApplied: z.array(z.string()),
      maxPoints: z.number(),
    }),
    generationSchema: z.object({
      incorrectSentence: z.string(),
      correctSentence: z.string(),
      errors: z.array(z.object({
        type: z.string(),
        description: z.string(),
      })),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(15),
    }),
    answerSchema: z.object({
      correctedSentence: z.string(),
      explanations: z.array(z.string()).optional(),
      timeSpent: z.number().optional(),
    }),
    supportsHints: true,
    supportsPartialCredit: true,
    defaultPoints: 15,
    defaultTimeLimit: 180,
  },
  
  [QuestionTypeName.AUDIO_COMPREHENSION]: {
    name: QuestionTypeName.AUDIO_COMPREHENSION,
    displayName: 'Audio Comprehension',
    description: 'Listen and answer questions about audio content',
    category: 'audio',
    supportedSessions: [SessionTypeEnum.LISTENING],
    markingMethod: MarkingMethod.AUTOMATIC,
    markingSchema: MultipleChoiceMarkingSchema,
    generationSchema: z.object({
      audioUrl: z.string(),
      transcript: z.string(),
      questions: z.array(MultipleChoiceGenerationSchema),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(20),
    }),
    answerSchema: z.object({
      answers: z.array(MultipleChoiceAnswerSchema),
      timeSpent: z.number().optional(),
    }),
    supportsHints: false,
    supportsPartialCredit: true,
    defaultPoints: 20,
    defaultTimeLimit: 600,
  },
  
  [QuestionTypeName.DICTATION]: {
    name: QuestionTypeName.DICTATION,
    displayName: 'Dictation',
    description: 'Write what you hear',
    category: 'audio',
    supportedSessions: [SessionTypeEnum.LISTENING],
    markingMethod: MarkingMethod.AI_ASSISTED,
    markingSchema: z.object({
      transcription: z.string(),
      originalText: z.string(),
      accuracy: z.number().min(0).max(1),
      maxPoints: z.number(),
    }),
    generationSchema: z.object({
      audioUrl: z.string(),
      correctText: z.string(),
      playbackSpeed: z.number().default(1.0),
      maxReplays: z.number().default(3),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(25),
    }),
    answerSchema: z.object({
      transcription: z.string(),
      replaysUsed: z.number(),
      timeSpent: z.number().optional(),
    }),
    requiresAudioRecorder: false,
    supportsHints: false,
    supportsPartialCredit: true,
    defaultPoints: 25,
    defaultTimeLimit: 480,
  },
  
  [QuestionTypeName.PRONUNCIATION]: {
    name: QuestionTypeName.PRONUNCIATION,
    displayName: 'Pronunciation',
    description: 'Practice pronouncing words or sentences',
    category: 'spoken',
    supportedSessions: [SessionTypeEnum.SPEAKING],
    markingMethod: MarkingMethod.AI_ASSISTED,
    markingSchema: z.object({
      audioUrl: z.string(),
      targetText: z.string(),
      pronunciationScore: z.number().min(0).max(100),
      fluencyScore: z.number().min(0).max(100),
      maxPoints: z.number(),
    }),
    generationSchema: z.object({
      text: z.string(),
      modelAudioUrl: z.string().optional(),
      phonetics: z.string().optional(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(15),
    }),
    answerSchema: z.object({
      audioUrl: z.string(),
      duration: z.number(),
      attempts: z.number(),
      timeSpent: z.number().optional(),
    }),
    requiresAudioRecorder: true,
    supportsHints: true,
    supportsPartialCredit: true,
    defaultPoints: 15,
    defaultTimeLimit: 120,
  },
  
  [QuestionTypeName.CONVERSATION]: {
    name: QuestionTypeName.CONVERSATION,
    displayName: 'Conversation',
    description: 'Engage in a spoken conversation',
    category: 'spoken',
    supportedSessions: [SessionTypeEnum.SPEAKING],
    markingMethod: MarkingMethod.AI_ASSISTED,
    markingSchema: z.object({
      responses: z.array(z.object({
        audioUrl: z.string(),
        transcript: z.string(),
      })),
      rubric: z.object({
        fluency: z.number().min(0).max(1),
        accuracy: z.number().min(0).max(1),
        pronunciation: z.number().min(0).max(1),
        relevance: z.number().min(0).max(1),
      }),
      maxPoints: z.number(),
    }),
    generationSchema: z.object({
      scenario: z.string(),
      prompts: z.array(z.string()),
      expectedResponses: z.array(z.string()).optional(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(30),
    }),
    answerSchema: z.object({
      responses: z.array(z.object({
        audioUrl: z.string(),
        duration: z.number(),
        promptIndex: z.number(),
      })),
      timeSpent: z.number().optional(),
    }),
    requiresAudioRecorder: true,
    supportsHints: false,
    supportsPartialCredit: true,
    defaultPoints: 30,
    defaultTimeLimit: 600,
  },
  
  [QuestionTypeName.ORAL_PRESENTATION]: {
    name: QuestionTypeName.ORAL_PRESENTATION,
    displayName: 'Oral Presentation',
    description: 'Give a spoken presentation on a topic',
    category: 'spoken',
    supportedSessions: [SessionTypeEnum.SPEAKING],
    markingMethod: MarkingMethod.AI_ASSISTED,
    markingSchema: z.object({
      audioUrl: z.string(),
      transcript: z.string(),
      duration: z.number(),
      rubric: z.object({
        content: z.number().min(0).max(1),
        structure: z.number().min(0).max(1),
        delivery: z.number().min(0).max(1),
        pronunciation: z.number().min(0).max(1),
        vocabulary: z.number().min(0).max(1),
      }),
      maxPoints: z.number(),
    }),
    generationSchema: z.object({
      topic: z.string(),
      instructions: z.string(),
      minDuration: z.number().default(60),
      maxDuration: z.number().default(180),
      keyPoints: z.array(z.string()).optional(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      points: z.number().default(40),
    }),
    answerSchema: z.object({
      audioUrl: z.string(),
      duration: z.number(),
      notes: z.string().optional(),
      timeSpent: z.number().optional(),
    }),
    requiresAudioRecorder: true,
    requiresTimer: true,
    supportsHints: false,
    supportsPartialCredit: true,
    defaultPoints: 40,
    defaultTimeLimit: 900,
  },
};

// Helper functions
export function getQuestionMetadata(type: QuestionTypeName): QuestionMetadata {
  const metadata = QUESTION_METADATA[type];
  if (!metadata) {
    throw new Error(`Question type ${type} not found in registry`);
  }
  return metadata;
}

export function getQuestionsForSession(sessionType: SessionTypeEnum): QuestionTypeName[] {
  return Object.values(QuestionTypeName).filter(questionType => {
    const metadata = QUESTION_METADATA[questionType];
    return metadata?.supportedSessions?.includes(sessionType) || false;
  });
}

export function requiresManualMarking(type: QuestionTypeName): boolean {
  const metadata = getQuestionMetadata(type);
  return metadata.markingMethod === MarkingMethod.MANUAL;
}

export function requiresAIMarking(type: QuestionTypeName): boolean {
  const metadata = getQuestionMetadata(type);
  return metadata.markingMethod === MarkingMethod.AI_ASSISTED;
}

export function isAutomaticMarking(type: QuestionTypeName): boolean {
  const metadata = getQuestionMetadata(type);
  return metadata.markingMethod === MarkingMethod.AUTOMATIC;
}

// Validation helpers
export function validateQuestionGeneration(type: QuestionTypeName, data: unknown) {
  const metadata = getQuestionMetadata(type);
  return metadata.generationSchema.parse(data);
}

export function validateAnswer(type: QuestionTypeName, data: unknown) {
  const metadata = getQuestionMetadata(type);
  return metadata.answerSchema.parse(data);
}

export function validateMarking(type: QuestionTypeName, data: unknown) {
  const metadata = getQuestionMetadata(type);
  if (!metadata.markingSchema) {
    throw new Error(`Question type ${type} does not support automated marking`);
  }
  return metadata.markingSchema.parse(data);
}