import { z } from 'zod';
import { SessionTypeEnum } from '../session-registry';
import { QuestionTypeName, MarkingMethod } from './question-enums';
import { multipleChoiceConfig } from './configs/multiple-choice.config';

// Re-export enums for backward compatibility
export { QuestionTypeName, MarkingMethod } from './question-enums';

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

// Import schemas from config
import {
  MultipleChoiceGenerationSchema,
  MultipleChoiceAnswerSchema,
  MultipleChoiceMarkingSchema
} from './configs/multiple-choice.config';

// Complete registry of all question types
export const QUESTION_METADATA: Record<QuestionTypeName, QuestionMetadata> = {
  // Use modular config for multiple choice
  [QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE]: {
    name: multipleChoiceConfig.name,
    displayName: multipleChoiceConfig.displayName,
    description: multipleChoiceConfig.description,
    category: multipleChoiceConfig.category,
    supportedSessions: multipleChoiceConfig.supportedSessions,
    markingMethod: multipleChoiceConfig.markingMethod,
    markingSchema: multipleChoiceConfig.markingSchema,
    generationSchema: multipleChoiceConfig.generationSchema,
    answerSchema: multipleChoiceConfig.answerSchema,
    supportsHints: multipleChoiceConfig.supportsHints,
    supportsPartialCredit: multipleChoiceConfig.supportsPartialCredit,
    defaultPoints: multipleChoiceConfig.defaultPoints,
    defaultTimeLimit: multipleChoiceConfig.defaultTimeLimit,
    requiresRichTextEditor: multipleChoiceConfig.requiresRichTextEditor,
    requiresAudioRecorder: multipleChoiceConfig.requiresAudioRecorder,
    requiresTimer: multipleChoiceConfig.requiresTimer,
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
  // Import here to avoid circular dependency
  const { getSessionConfig } = require('../session-registry');

  try {
    // Get the session config which defines the EXACT supported questions for this session type
    const config = getSessionConfig(sessionType);
    return config.supportedQuestions || [];
  } catch (error) {
    // Fallback to metadata-based filtering if config not found
    console.warn(`Could not load config for session type ${sessionType}, falling back to metadata`, error);
    return Object.values(QuestionTypeName).filter(questionType => {
      const metadata = QUESTION_METADATA[questionType];
      return metadata?.supportedSessions?.includes(sessionType) || false;
    });
  }
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