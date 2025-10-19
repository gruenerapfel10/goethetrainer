import { z } from 'zod';
import { QuestionTypeName, MarkingMethod } from '../question-enums';
import { SessionTypeEnum } from '../../session-registry';

// Schema for multiple choice options
const MultipleChoiceOptionSchema = z.object({
  id: z.string().describe('Unique identifier for the option (0, 1, 2, 3)'),
  text: z.string().describe('The text content of the option in German (1-3 words max)'),
});

// Single question schema (without context - context is shared)
const QuestionSchema = z.object({
  prompt: z.string().describe('The question prompt text in German'),
  options: z.array(MultipleChoiceOptionSchema)
    .length(4)
    .describe('Exactly 4 answer options numbered 0-3'),
  correctOptionId: z.string().describe('ID of the correct option (0-3)'),
  explanation: z.string().describe('Explanation in German of why the answer is correct'),
});

// Batch generation schema: ONE context with 9 questions
export const MultipleChoiceBatchGenerationSchema = z.object({
  context: z.string().describe('Single German reading passage (200-300 words) for all 9 questions'),
  questions: z.array(QuestionSchema)
    .length(9)
    .describe('Exactly 9 questions about the same context (1 example + 8 actual)'),
});

// Single question schema with context (for backward compatibility)
const SingleQuestionSchema = z.object({
  prompt: z.string().describe('The question prompt text in German'),
  context: z.string().describe('The German reading passage (200-300 words)'),
  options: z.array(MultipleChoiceOptionSchema)
    .length(4)
    .describe('Exactly 4 answer options numbered 0-3'),
  correctOptionId: z.string().describe('ID of the correct option (0-3)'),
  explanation: z.string().describe('Explanation in German of why the answer is correct'),
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
  name: QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE,

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
    batchSystemPrompt: `You are a German language specialist creating Goethe C1 level reading comprehension tests.

Your task: Generate ONE German text passage (200-300 words) and create EXACTLY 9 comprehension questions about it.

Requirements:
1. ALL content in German language ONLY
2. One context passage (200-300 words, appropriate for C1 level)
3. Exactly 9 questions about this passage (1 example + 8 test questions)
4. Each question:
   - prompt: Question text in German
   - 4 options with SHORT text (1-3 words max, e.g., "dafür", "aber", "als Anlage zu")
   - correctOptionId: "0", "1", "2", or "3"
   - explanation: Why the correct answer is right

JSON Structure:
{
  "context": "Single German passage here (200-300 words)...",
  "questions": [
    {
      "prompt": "Frage 1 hier?",
      "options": [
        {"id": "0", "text": "option1"},
        {"id": "1", "text": "option2"},
        {"id": "2", "text": "option3"},
        {"id": "3", "text": "option4"}
      ],
      "correctOptionId": "0",
      "explanation": "Erklärung hier..."
    },
    ... (8 more questions with same structure)
  ]
}

Return EXACTLY 9 questions, all about the SAME context passage.`,

    // User prompt for batch generation
    batchUserPrompt: `Generate a Goethe C1 reading comprehension test: 1 German passage (200-300 words) with 9 questions.`,

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