import { z } from 'zod';
import { QuestionTypeName, MarkingMethod } from '../question-enums';
import { SessionTypeEnum } from '../../session-registry';

// Schema for multiple choice options
const MultipleChoiceOptionSchema = z.object({
  id: z.string().describe('Unique identifier for the option (0, 1, 2)'),
  text: z.string().describe('The text content of the option in German'),
});

// Single question schema
const QuestionSchema = z.object({
  prompt: z.string().describe('The question prompt/text in German'),
  context: z.string().optional().describe('Optional context or passage for the question'),
  options: z.array(MultipleChoiceOptionSchema)
    .length(3)
    .describe('Exactly 3 answer options numbered 0-2'),
  correctOptionId: z.string().describe('ID of the correct option (0-2)'),
  explanation: z.string().describe('Explanation in German of why the answer is correct'),
});

// Batch generation schema: Multiple questions
export const MultipleChoiceStandardBatchGenerationSchema = z.object({
  theme: z.string().describe('Theme/category of the questions (e.g., "WIRTSCHAFT", "BILDUNG", "TECHNOLOGIE")'),
  questions: z.array(QuestionSchema)
    .min(1)
    .describe('Array of multiple choice questions'),
});

// Single question generation schema
export const MultipleChoiceStandardGenerationSchema = QuestionSchema.extend({
  hints: z.array(z.string()).optional().describe('Progressive hints for the question'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  points: z.number().default(10),
  timeLimit: z.number().optional().describe('Time limit in seconds'),
});

// Answer schema for multiple choice
export const MultipleChoiceStandardAnswerSchema = z.object({
  selectedOptionId: z.string(),
  timeSpent: z.number().optional(),
  hintsUsed: z.number().default(0),
});

// Marking schema for multiple choice (automatic)
export const MultipleChoiceStandardMarkingSchema = z.object({
  selectedOptionId: z.string(),
  correctOptionId: z.string(),
  points: z.number(),
});

export const multipleChoiceStandardConfig = {
  // Question type identifier
  name: QuestionTypeName.MULTIPLE_CHOICE,

  // Metadata
  displayName: 'Multiple Choice (Standard)',
  description: 'Answer comprehension questions with 3 options',
  category: 'selection' as const,

  // Which session types support this question
  supportedSessions: [
    SessionTypeEnum.READING,
    SessionTypeEnum.LISTENING,
  ],

  // Marking configuration
  markingMethod: MarkingMethod.AUTOMATIC,
  markingSchema: MultipleChoiceStandardMarkingSchema,

  // Generation schema for AI to create questions
  generationSchema: MultipleChoiceStandardGenerationSchema,

  // Session generation schema for creating all questions at once
  sessionGenerationSchema: MultipleChoiceStandardBatchGenerationSchema,

  // Answer schema for validation
  answerSchema: MultipleChoiceStandardAnswerSchema,

  // UI preferences
  requiresRichTextEditor: false,
  requiresAudioRecorder: false,
  requiresTimer: false,
  supportsHints: true,
  supportsPartialCredit: false,

  // Scoring configuration
  defaultPoints: 10,
  defaultTimeLimit: 60, // in seconds

  // AI Generation configuration
  aiGeneration: {
    modelId: 'claude-haiku-4-5-20251001',
    temperature: 0.7,

    // System prompt for session generation (multiple questions at once)
    sessionSystemPrompt: `You are a German language specialist creating Goethe C1 level reading comprehension tests.

Your task: Generate multiple-choice reading comprehension questions in German.

Requirements:
1. ALL content in German language ONLY
2. Each question should have:
   - A clear prompt/question text in German
   - Exactly 3 answer options (numbered 0-2)
   - One correct answer
   - An explanation of why the answer is correct
3. Questions should test comprehension, vocabulary, or grammar understanding
4. Make incorrect options plausible but clearly wrong
5. Difficulty appropriate for C1 level (advanced)

JSON Structure:
{
  "theme": "WIRTSCHAFT",
  "questions": [
    {
      "prompt": "Was bedeutet der Begriff 'Nachhaltigkeit' im wirtschaftlichen Kontext?",
      "options": [
        {"id": "0", "text": "Langfristige wirtschaftliche Entwicklung unter Berücksichtigung ökologischer und sozialer Faktoren"},
        {"id": "1", "text": "Maximierung des kurzfristigen Gewinns"},
        {"id": "2", "text": "Fokussierung ausschließlich auf ökonomische Ziele"}
      ],
      "correctOptionId": "0",
      "explanation": "Nachhaltigkeit bedeutet eine ausgewogene Entwicklung, die wirtschaftliche, ökologische und soziale Aspekte berücksichtigt."
    }
  ]
}

Generate questions appropriate for the C1 level.`,

    // User prompt for session generation
    sessionUserPrompt: `Generate {{count}} Goethe C1 reading comprehension multiple choice questions.`,

    // System prompt for SINGLE generation (backward compatibility)
    systemPrompt: `You are a specialized question generator for German language learning (Goethe C1 level).

Your task is to generate a multiple choice reading comprehension question.

Requirements:
1. Generate a question in German appropriate for C1 level learners
2. The question should test reading comprehension, vocabulary, or grammar
3. Provide exactly 3 answer options (numbered 0-2) with only ONE correct answer
4. Make incorrect options plausible but clearly wrong
5. Include an explanation of why the correct answer is right`,

    // User prompt template for single generation
    userPrompt: `Generate a reading comprehension question with difficulty level {{difficulty}}.`,
  },
};
