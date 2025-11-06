import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { QuestionTypeName } from './question-enums';
import { multipleChoiceConfig } from './configs/gap-text-multiple-choice.config';
import { multipleChoiceStandardConfig } from './configs/multiple-choice-standard.config';
import type { QuestionDifficulty } from './question-types';
import { SessionTypeEnum } from '../session-registry';
import { QuestionInputType } from './question-types';
import { generateSourceWithGaps } from './source-generator';

export const maxDuration = 30;

interface QuestionConfig {
  name: QuestionTypeName;
  displayName: string;
  generationSchema: z.ZodSchema;
  sessionGenerationSchema?: z.ZodSchema;
  supportedSessions?: SessionTypeEnum[];
  aiGeneration: {
    modelId: string;
    temperature: number;
    maxTokens?: number;
    systemPrompt: string;
    userPrompt: string;
    sessionSystemPrompt?: string;
    sessionUserPrompt?: string;
  };
  defaultPoints: number;
  defaultTimeLimit: number;
  markingMethod: string;
}

// Registry of question configs
const QUESTION_CONFIGS: Record<string, QuestionConfig> = {
  [QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE]: multipleChoiceConfig as QuestionConfig,
  [QuestionTypeName.MULTIPLE_CHOICE]: multipleChoiceStandardConfig as QuestionConfig,
  // Future configs can be added here:
  // [QuestionTypeName.TRUE_FALSE]: trueFalseConfig,
  // [QuestionTypeName.SHORT_ANSWER]: shortAnswerConfig,
};

interface GenerateQuestionOptions {
  questionType: QuestionTypeName;
  sessionType: SessionTypeEnum;
  difficulty: QuestionDifficulty;
  topicIndex: number;
  userLocale?: string;
}

/**
 * Generate a question using AI based on the question type configuration
 */
export async function generateQuestionWithAI(options: GenerateQuestionOptions) {
  const {
    questionType,
    sessionType,
    difficulty,
    topicIndex,
    userLocale: _userLocale = 'de',
  } = options;

  // Get the config for this question type
  const config = QUESTION_CONFIGS[questionType];
  if (!config) {
    throw new Error(`No configuration found for question type: ${questionType}`);
  }

  // Validate that this question type is supported for the session
  if (config.supportedSessions && !config.supportedSessions.includes(sessionType)) {
    throw new Error(`Question type ${questionType} is not supported for session type ${sessionType}`);
  }

  const { aiGeneration, generationSchema } = config;

  // Initialize the model
  const model = anthropic(aiGeneration.modelId);

  // Prepare the user prompt with variables
  const userPrompt = aiGeneration.userPrompt
    .replace('{{topicIndex}}', topicIndex.toString())
    .replace('{{difficulty}}', difficulty)
    .replace('{{sessionType}}', sessionType);

  try {
    // Generate the question using AI
    const generateParams: any = {
      model,
      schema: generationSchema,
      system: aiGeneration.systemPrompt,
      prompt: userPrompt,
      temperature: aiGeneration.temperature,
    };

    if (aiGeneration.maxTokens) {
      generateParams.maxTokens = aiGeneration.maxTokens;
    }

    const result = await generateObject(generateParams);

    // Add metadata to the generated question
    const questionData = result.object as Record<string, any>;
    const generatedQuestion = {
      ...questionData,
      questionType,
      sessionType,
      difficulty,
      points: typeof questionData.points === 'number'
        ? questionData.points
        : questionData.isExample ? 0 : 1,
      timeLimit: questionData.timeLimit || config.defaultTimeLimit,
      markingMethod: config.markingMethod,
      inputType: inferInputType(questionType),
      // Legacy mirror to keep downstream consumers stable during migration.
      answerType: inferInputType(questionType),
    };

    return generatedQuestion;
  } catch (error) {
    console.error('Error generating question with AI:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate ${questionType} question: ${errorMessage}`);
  }
}

export async function generateSessionQuestion(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty = 'intermediate' as QuestionDifficulty,
  questionType: QuestionTypeName
): Promise<any[]> {
  const questionTypes = [questionType];
  const count = questionType === 'gap_text_multiple_choice' ? 9 : 7;
  // Check if we're generating MULTIPLE_CHOICE questions
  const isMultipleChoice = questionTypes?.includes(QuestionTypeName.MULTIPLE_CHOICE);

  // For MULTIPLE_CHOICE, use batch generation (1 context + N questions)
  if (isMultipleChoice && count >= 1) {
    console.log(`Generating ${count} MULTIPLE_CHOICE questions from 1 context...`);
    try {
      const config = QUESTION_CONFIGS[QuestionTypeName.MULTIPLE_CHOICE];
      if (!config || !config.sessionGenerationSchema) {
        throw new Error('MULTIPLE_CHOICE config missing sessionGenerationSchema');
      }

      const { aiGeneration } = config;
      const model = anthropic(aiGeneration.modelId);

      // Use session generation prompt
      const userPrompt = aiGeneration.sessionUserPrompt?.replace('{{count}}', count.toString()) ||
        `Generate a German reading passage with ${count} comprehension questions.`;

      const result = await generateObject({
        model,
        schema: config.sessionGenerationSchema,
        system: aiGeneration.sessionSystemPrompt || aiGeneration.systemPrompt,
        prompt: userPrompt,
        temperature: aiGeneration.temperature,
      });

      const data = result.object as any;
      const { context, questions, title, subtitle, theme } = data;

      // Transform result into array of questions with shared context
      const questionsWithContext = questions.map((q: any) => ({
        ...q,
        context,
        title,
        subtitle,
        theme,
        difficulty,
        points: 1,
        timeLimit: 60,
        inputType: inferInputType(QuestionTypeName.MULTIPLE_CHOICE),
        answerType: inferInputType(QuestionTypeName.MULTIPLE_CHOICE),
      }));

      return questionsWithContext;
    } catch (error) {
      console.error('MULTIPLE_CHOICE session generation failed:', error);
      // Fall back to individual generation below
    }
  }

  // For reading session with 9 questions, use GAP_TEXT session generation (1 context + 9 questions)
  const isGapTextSession = count === 9 && sessionType === SessionTypeEnum.READING && questionType === QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE;

  if (isGapTextSession) {
    console.log('Generating 9 GAP_TEXT questions from 1 context...');
    try {
      // Use two-pass system: generate source with gaps
      const sourceWithGaps = await generateSourceWithGaps(difficulty);

      // Now generate 4 options for each gap
      const config = QUESTION_CONFIGS[questionType];
      if (!config) {
        throw new Error(`No configuration found for question type: ${questionType}`);
      }

      const { aiGeneration } = config;
      const model = anthropic(aiGeneration.modelId);

      const questionPromises = sourceWithGaps.gaps.map(async (gap, index) => {
        const gapPrompt = `Generate 4 multiple choice options for this gap fill exercise.

Gap number: ${gap.gapNumber}
Correct answer: "${gap.removedWord}"
Context: ${sourceWithGaps.gappedContext}

Create 4 plausible options where one is the correct answer "${gap.removedWord}".
Options should be 1-3 words each.
Return as JSON with id (0-3) and text for each option.`;

        const optionsSchema = z.object({
          options: z.array(
            z.object({
              id: z.string().describe('Option ID: 0, 1, 2, or 3'),
              text: z.string().describe('Option text (1-3 words)'),
            })
          ).length(4).describe('Exactly 4 options'),
          correctOptionId: z.string().describe('ID of correct option (0-3)'),
        });

        const result = await generateObject({
          model,
          schema: optionsSchema,
          system: 'You are a German language expert creating multiple choice options for gap fill exercises.',
          prompt: gapPrompt,
          temperature: 0.7,
        });

        return {
          prompt: `Lücke ${gap.gapNumber}: Welches Wort passt hier?`,
          options: result.object.options,
          correctOptionId: result.object.correctOptionId,
          explanation: `Das richtige Wort ist "${gap.removedWord}".`,
        };
      });

      const questions = await Promise.all(questionPromises);

      // Transform result into array of questions with shared context
      const questionsWithContext = questions.map((q: any, index: number) => ({
        ...q,
        context: sourceWithGaps.gappedContext,
        title: sourceWithGaps.title,
        subtitle: sourceWithGaps.subtitle,
        theme: sourceWithGaps.theme,
        isExample: index === 0, // First question is example
        exampleAnswer: index === 0 ? q.correctOptionId : undefined,
        difficulty,
        points: index === 0 ? 0 : 1,
        timeLimit: 60,
        inputType: inferInputType(QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE),
        answerType: inferInputType(QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE),
      }));

      return questionsWithContext;
    } catch (error) {
      console.error('Session generation failed:', error);
      // Fall back to individual generation below
    }
  }

  // Original sequential generation logic
  const questions = [];

  // If no specific question types provided, use all supported types
  const typesToUse = questionTypes || Object.keys(QUESTION_CONFIGS) as QuestionTypeName[];

  // Generate questions in parallel for better performance
  const promises = [];
  for (let i = 0; i < count; i++) {
    const questionType = typesToUse[i % typesToUse.length];
    promises.push(
      generateQuestionWithAI({
        questionType,
        sessionType,
        difficulty,
        topicIndex: i,
      })
    );
  }

  try {
    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    console.error('Error generating questions:', error);
    // Fallback to sequential generation if parallel fails
    for (let i = 0; i < count; i++) {
      try {
        const questionType = typesToUse[i % typesToUse.length];
        const question = await generateQuestionWithAI({
          questionType,
          sessionType,
          difficulty,
          topicIndex: i,
        });
        questions.push(question);
      } catch (err) {
        console.error(`Failed to generate question ${i}:`, err);
      }
    }
  }

  return questions;
}

/**
 * Get available question types for a session
 */
export function getAvailableQuestionTypes(sessionType: SessionTypeEnum): QuestionTypeName[] {
  return Object.entries(QUESTION_CONFIGS)
    .filter(([_, config]) => {
      const cfg = config as QuestionConfig;
      return !cfg.supportedSessions || cfg.supportedSessions.includes(sessionType);
    })
    .map(([type]) => type as QuestionTypeName);
}
const INPUT_TYPE_MAP: Record<QuestionTypeName, QuestionInputType> = {
  [QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE]: QuestionInputType.MULTIPLE_CHOICE,
  [QuestionTypeName.MULTIPLE_CHOICE]: QuestionInputType.MULTIPLE_CHOICE,
  [QuestionTypeName.TRUE_FALSE]: QuestionInputType.TRUE_FALSE,
  [QuestionTypeName.SHORT_ANSWER]: QuestionInputType.SHORT_TEXT,
  [QuestionTypeName.FILL_IN_BLANK]: QuestionInputType.MATCHING,
  [QuestionTypeName.ESSAY]: QuestionInputType.LONG_TEXT,
  [QuestionTypeName.TRANSLATION]: QuestionInputType.LONG_TEXT,
  [QuestionTypeName.SENTENCE_CORRECTION]: QuestionInputType.SHORT_TEXT,
  [QuestionTypeName.AUDIO_COMPREHENSION]: QuestionInputType.MULTIPLE_CHOICE,
  [QuestionTypeName.DICTATION]: QuestionInputType.MATCHING,
  [QuestionTypeName.PRONUNCIATION]: QuestionInputType.AUDIO_RECORDING,
  [QuestionTypeName.CONVERSATION]: QuestionInputType.LONG_TEXT,
  [QuestionTypeName.ORAL_PRESENTATION]: QuestionInputType.AUDIO_RECORDING,
};

function inferInputType(questionType: QuestionTypeName): QuestionInputType {
  const mapping = INPUT_TYPE_MAP[questionType];
  if (!mapping) {
    return QuestionInputType.SHORT_TEXT;
  }
  return mapping;
}
