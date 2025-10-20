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

// Batch generation schema: ONE source text with multiple questions
export const MultipleChoiceStandardBatchGenerationSchema = z.object({
  theme: z.string().describe('Theme/category of the text (e.g., "WIRTSCHAFT", "BILDUNG", "TECHNOLOGIE")'),
  title: z.string().describe('Title of the reading passage'),
  subtitle: z.string().describe('Subtitle or brief description of the passage'),
  context: z.string().describe('German reading passage (200-300 words) for ALL questions'),
  questions: z.array(
    z.object({
      prompt: z.string().describe('The question text in German'),
      options: z.array(MultipleChoiceOptionSchema)
        .length(3)
        .describe('Exactly 3 answer options numbered 0-2'),
      correctOptionId: z.string().describe('ID of the correct option (0-2)'),
      explanation: z.string().describe('Explanation in German of why the answer is correct'),
    })
  ).min(1).describe('Array of comprehension questions about the SAME context'),
});

// Single question generation schema
export const MultipleChoiceStandardGenerationSchema = QuestionSchema.extend({
  theme: z.string().describe('Theme/category of the text (e.g., "WIRTSCHAFT", "BILDUNG", "TECHNOLOGIE")'),
  title: z.string().describe('Title of the reading passage'),
  subtitle: z.string().describe('Subtitle or brief description of the passage'),
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

Your task: Generate ONE German reading passage with multiple-choice comprehension questions.

Requirements:
1. ALL content in German language ONLY
2. Provide a THEME (category like "WIRTSCHAFT", "BILDUNG", "TECHNOLOGIE", "GESELLSCHAFT", "WISSENSCHAFT")
3. Provide a TITLE for the reading passage
4. Provide a SUBTITLE (brief description)
5. ONE continuous reading passage (400-600 words, C1 level) structured in EXACTLY 7 PARAGRAPHS
   - Each paragraph should be substantial (50-80 words)
   - Each paragraph should cover a distinct aspect of the topic
   - Paragraphs should flow logically from one to the next
   - Use line breaks between paragraphs (\n\n)
6. Generate comprehension questions about this passage
7. Each question:
   - Should relate to a specific paragraph or section of the text
   - Clear question text in German
   - Exactly 3 answer options (numbered 0-2)
   - One correct answer
   - Explanation why it's correct

IMPORTANT: The context must be a CONTINUOUS TEXT with 7 paragraphs. NO gaps like [GAP_1], just raw German text.

JSON Structure:
{
  "theme": "GESELLSCHAFT",
  "title": "Der elterliche Handygebrauch und seine Folgen",
  "subtitle": "Wie sich Smartphone-Nutzung auf Familien auswirkt",
  "context": "Paragraph 1 hier (50-80 Wörter)...\n\nParagraph 2 hier...\n\nParagraph 3 hier...\n\n[continues for 7 paragraphs total]",
  "questions": [
    {
      "prompt": "Was ist laut Text der Hauptgrund für den Wandel?",
      "options": [
        {"id": "0", "text": "Technologische Entwicklung"},
        {"id": "1", "text": "Wirtschaftliche Krise"},
        {"id": "2", "text": "Politische Veränderungen"}
      ],
      "correctOptionId": "0",
      "explanation": "Der Text beschreibt die technologische Entwicklung als Haupttreiber."
    }
  ]
}

All questions MUST be about the SAME context passage. The text should be engaging, informative, and appropriate for C1 level learners.`,

    // User prompt for session generation
    sessionUserPrompt: `Generate a German reading passage structured in 7 paragraphs with {{count}} comprehension questions (3 options each). The text should be 400-600 words total.`,

    // System prompt for SINGLE generation (backward compatibility)
    systemPrompt: `You are a specialized question generator for German language learning (Goethe C1 level).

Your task is to generate a multiple choice reading comprehension question.

Requirements:
1. Generate a question in German appropriate for C1 level learners
2. Provide a THEME (category like "WIRTSCHAFT", "BILDUNG", "TECHNOLOGIE")
3. Provide a TITLE and SUBTITLE for the reading passage
4. Provide a reading passage (context) in German (200-300 words)
5. Create ONE comprehension question about the passage
6. Provide exactly 3 answer options (numbered 0-2) with only ONE correct answer
7. Make incorrect options plausible but clearly wrong
8. Include an explanation of why the correct answer is right`,

    // User prompt template for single generation
    userPrompt: `Generate a reading comprehension question with difficulty level {{difficulty}}.`,
  },
};
