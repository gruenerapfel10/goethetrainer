import { z } from 'zod';
import { QuestionTypeName, MarkingMethod } from '../question-enums';
import { SessionTypeEnum } from '../../session-registry';

// Schema for multiple choice options
const MultipleChoiceOptionSchema = z.object({
  id: z.string().describe('Unique identifier for the option (0, 1, 2, 3)'),
  text: z.string().describe('The text content of the option in German'),
});

// Single question schema
const SingleQuestionSchema = z.object({
  prompt: z.string().describe('The question prompt text in German'),
  context: z.string().describe('The German reading passage (200-300 words)'),
  options: z.array(MultipleChoiceOptionSchema)
    .length(4)
    .describe('Exactly 4 answer options numbered 0-3'),
  correctOptionId: z.string().describe('ID of the correct option (0-3)'),
  explanation: z.string().describe('Explanation in German of why the answer is correct'),
});

// Batch generation schema for AI to create all questions at once
export const MultipleChoiceBatchGenerationSchema = z.object({
  exampleQuestion: SingleQuestionSchema.describe('The example question with the answer that will be pre-filled'),
  actualQuestions: z.array(SingleQuestionSchema)
    .length(8)
    .describe('Exactly 8 actual test questions'),
});

// Keep the old schema for backward compatibility (single question generation)
export const MultipleChoiceGenerationSchema = SingleQuestionSchema.extend({
  hints: z.array(z.string()).optional().describe('Progressive hints for the question'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  points: z.number().default(10),
  timeLimit: z.number().optional().describe('Time limit in seconds'),
});

// Answer schema for multiple choice
export const MultipleChoiceAnswerSchema = z.object({
  selectedOptionId: z.string(),
  timeSpent: z.number().optional(),
  hintsUsed: z.number().default(0),
});

// Marking schema for multiple choice (automatic)
export const MultipleChoiceMarkingSchema = z.object({
  selectedOptionId: z.string(),
  correctOptionId: z.string(),
  points: z.number(),
});

export const multipleChoiceConfig = {
  // Question type identifier
  name: QuestionTypeName.MULTIPLE_CHOICE,

  // Metadata
  displayName: 'Multiple Choice',
  description: 'Select the correct answer from given options',
  category: 'selection' as const,

  // Which session types support this question
  supportedSessions: [
    SessionTypeEnum.READING,
    SessionTypeEnum.LISTENING,
  ],

  // Marking configuration
  markingMethod: MarkingMethod.AUTOMATIC,
  markingSchema: MultipleChoiceMarkingSchema,

  // Generation schema for AI to create questions
  generationSchema: MultipleChoiceGenerationSchema,

  // Batch generation schema for creating all questions at once
  batchGenerationSchema: MultipleChoiceBatchGenerationSchema,

  // Answer schema for validation
  answerSchema: MultipleChoiceAnswerSchema,

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

    // System prompt for BATCH generation (all questions at once)
    batchSystemPrompt: `You are a specialized question generator for German language learning (Goethe C1 level).

⚠️ RESPONSE MUST HAVE EXACTLY 2 FIELDS AT TOP LEVEL:
1. "exampleQuestion" - A SINGLE question object
2. "actualQuestions" - An ARRAY containing EXACTLY 8 question objects

Your task is to generate a COMPLETE reading comprehension test with EXACTLY 9 questions total.

🔴 CRITICAL REQUIREMENTS:
1. ALL content MUST be in German language ONLY
2. Generate EXACTLY 9 questions total (THIS IS MANDATORY):
   - 1 example question → goes in "exampleQuestion" field
   - EXACTLY 8 actual test questions → go in "actualQuestions" array (NOT fewer, NOT more - EXACTLY 8)
3. Each question MUST have EXACTLY 4 answer options (IDs: "0", "1", "2", "3")
4. Answer options MUST be SHORT (1-3 words maximum):
   - Good: "dafür", "aber", "als Anlage zu", "in Einklang mit"
   - Bad: Long sentences or explanations
5. Only ONE correct answer per question
6. Each question needs a unique German passage (200-300 words)
7. Each question MUST have: prompt, context, options array, correctOptionId, explanation

🔴 STRUCTURE MUST BE:
{
  "exampleQuestion": {
    "prompt": "...",
    "context": "...",
    "options": [{"id": "0", "text": "..."}, {"id": "1", "text": "..."}, {"id": "2", "text": "..."}, {"id": "3", "text": "..."}],
    "correctOptionId": "0",
    "explanation": "..."
  },
  "actualQuestions": [
    { same structure as exampleQuestion },
    { same structure as exampleQuestion },
    { same structure as exampleQuestion },
    { same structure as exampleQuestion },
    { same structure as exampleQuestion },
    { same structure as exampleQuestion },
    { same structure as exampleQuestion },
    { same structure as exampleQuestion }
  ]
}

⚠️ IF YOU DO NOT INCLUDE BOTH "exampleQuestion" AND "actualQuestions" WITH EXACTLY 8 ITEMS, YOUR RESPONSE WILL BE REJECTED!

Topics for variety: Technology, Sustainability, Culture, Business, Education, Health, Travel, Art, Science, Social issues`,

    // User prompt for batch generation
    batchUserPrompt: `Generate a complete Goethe C1 reading comprehension test with 1 example question and 8 actual questions.`,

    // System prompt for SINGLE generation (backward compatibility)
    systemPrompt: `You are a specialized question generator for German language learning (Goethe C1 level).

Your task is to generate a multiple choice reading comprehension question based on German text content.

Requirements:
1. Generate a German text passage (200-300 words) appropriate for C1 level learners
2. Create ONE multiple choice question about the text
3. The question should test reading comprehension of the main ideas or specific details
4. Provide exactly 5 answer options (numbered 0-4) with only ONE correct answer
5. Make incorrect options plausible but clearly wrong based on the text
6. Include an explanation of why the correct answer is right`,

    // User prompt template for single generation
    userPrompt: `Generate question number {{topicIndex}} (0-based index) for a reading comprehension test with difficulty level {{difficulty}}.`,
  },
};