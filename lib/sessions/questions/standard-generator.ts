import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { QuestionTypeName } from './question-enums';
import { multipleChoiceConfig } from './configs/gap-text-multiple-choice.config';
import { multipleChoiceStandardConfig } from './configs/multiple-choice-standard.config';
import type { QuestionDifficulty } from './question-types';
import {
  SessionTypeEnum,
  type AIGenerationOverrides,
  type SessionSourceOptions,
  type SessionLayoutQuestionDefaults,
} from '../session-registry';
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

interface QuestionConfigOverrides {
  aiGeneration?: AIGenerationOverrides;
  defaults?: SessionLayoutQuestionDefaults;
}

export interface SessionQuestionGenerationOptions {
  questionCount?: number;
  aiGeneration?: AIGenerationOverrides;
  defaults?: SessionLayoutQuestionDefaults;
  source?: SessionSourceOptions;
}

const AI_OVERRIDE_KEYS: Array<keyof QuestionConfig['aiGeneration']> = [
  'modelId',
  'temperature',
  'maxTokens',
  'systemPrompt',
  'userPrompt',
  'sessionSystemPrompt',
  'sessionUserPrompt',
];

function mergeAIGenerationConfig(
  base: QuestionConfig['aiGeneration'],
  overrides?: AIGenerationOverrides
): QuestionConfig['aiGeneration'] {
  if (!overrides) {
    return { ...base };
  }

  const merged: QuestionConfig['aiGeneration'] = { ...base };
  AI_OVERRIDE_KEYS.forEach(key => {
    const value = overrides[key as keyof AIGenerationOverrides];
    if (value !== undefined) {
      (merged as any)[key] = value;
    }
  });
  return merged;
}

function resolvePoints(
  questionData: Record<string, any>,
  defaults?: SessionLayoutQuestionDefaults
): number {
  if (typeof questionData.points === 'number') {
    return questionData.points;
  }
  if (questionData.isExample) {
    return 0;
  }
  if (defaults?.points !== undefined) {
    return defaults.points;
  }
  return 1;
}

function resolveTimeLimit(
  questionData: Record<string, any>,
  defaults: SessionLayoutQuestionDefaults | undefined,
  fallback: number
): number {
  if (typeof questionData.timeLimit === 'number') {
    return questionData.timeLimit;
  }
  if (defaults?.timeLimit !== undefined) {
    return defaults.timeLimit;
  }
  return fallback;
}

interface GenerateQuestionOptions {
  questionType: QuestionTypeName;
  sessionType: SessionTypeEnum;
  difficulty: QuestionDifficulty;
  topicIndex: number;
  userLocale?: string;
  overrides?: QuestionConfigOverrides;
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
    overrides,
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

  const generationSchema = config.generationSchema;
  const aiGeneration = mergeAIGenerationConfig(config.aiGeneration, overrides?.aiGeneration);

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

    if (aiGeneration.maxTokens !== undefined) {
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
      points: resolvePoints(questionData, overrides?.defaults),
      timeLimit: resolveTimeLimit(questionData, overrides?.defaults, config.defaultTimeLimit ?? 60),
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
  questionType: QuestionTypeName,
  options: SessionQuestionGenerationOptions = {}
): Promise<any[]> {
  const config = QUESTION_CONFIGS[questionType];
  if (!config) {
    throw new Error(`No configuration found for question type: ${questionType}`);
  }

  const count =
    options.questionCount ??
    options.source?.gaps?.requiredCount ??
    (questionType === QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE ? 9 : 7);

  if (count <= 0) {
    return [];
  }

  const aiGeneration = mergeAIGenerationConfig(config.aiGeneration, options.aiGeneration);
  const defaultPoints = options.defaults?.points ?? 1;
  const defaultTimeLimit = options.defaults?.timeLimit ?? (config.defaultTimeLimit ?? 60);

  // Batch generation for MULTIPLE_CHOICE (Teil 2 style)
  if (
    questionType === QuestionTypeName.MULTIPLE_CHOICE &&
    config.sessionGenerationSchema &&
    count >= 1
  ) {
    console.log(`Generating ${count} MULTIPLE_CHOICE questions from shared context...`);
    try {
      const model = anthropic(aiGeneration.modelId);
      const sessionSystemPrompt = aiGeneration.sessionSystemPrompt ?? aiGeneration.systemPrompt;
      const sessionUserPromptTemplate = aiGeneration.sessionUserPrompt ?? aiGeneration.userPrompt;
      const userPrompt = sessionUserPromptTemplate.replace('{{count}}', count.toString());

      const result = await generateObject({
        model,
        schema: config.sessionGenerationSchema,
        system: sessionSystemPrompt,
        prompt: userPrompt,
        temperature: aiGeneration.temperature,
        ...(aiGeneration.maxTokens !== undefined ? { maxTokens: aiGeneration.maxTokens } : {}),
      });

      const data = result.object as any;
      const { context, questions, title, subtitle, theme } = data;

      return questions.map((q: any) => ({
        ...q,
        context,
        title,
        subtitle,
        theme,
        difficulty,
        points: q.points ?? defaultPoints,
        timeLimit: q.timeLimit ?? defaultTimeLimit,
        inputType: inferInputType(QuestionTypeName.MULTIPLE_CHOICE),
        answerType: inferInputType(QuestionTypeName.MULTIPLE_CHOICE),
      }));
    } catch (error) {
      console.error('MULTIPLE_CHOICE session generation failed:', error);
      // Fall back to individual generation below
    }
  }

  // Reading GAP_TEXT generation with shared source (Teils 1 & 3)
  if (
    sessionType === SessionTypeEnum.READING &&
    questionType === QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE
  ) {
    console.log(`Generating ${count} GAP_TEXT questions from 1 context...`);
    try {
      const sourceWithGaps = await generateSourceWithGaps(difficulty, options.source);
      const model = anthropic(aiGeneration.modelId);

      const optionsSchema = z.object({
        options: z
          .array(
            z.object({
              id: z.string().describe('Option ID: 0, 1, 2, or 3'),
              text: z.string().describe('Option text (1-3 words)'),
            })
          )
          .length(4)
          .describe('Exactly 4 options'),
        correctOptionId: z.string().describe('ID of correct option (0-3)'),
      });

      const gaps = sourceWithGaps.gaps.slice(0, count);
      const questionPromises = gaps.map(async gap => {
        const gapPrompt = `Generate 4 multiple choice options for this gap fill exercise.

Gap number: ${gap.gapNumber}
Correct answer: "${gap.removedWord}"
Context: ${sourceWithGaps.gappedContext}

Create 4 plausible options where one is the correct answer "${gap.removedWord}".
Options should be 1-3 words each.
Return as JSON with id (0-3) and text for each option.`;

        const result = await generateObject({
          model,
          schema: optionsSchema,
          system:
            options.source?.gaps?.systemPrompt ??
            'You are a German language expert creating multiple choice options for gap fill exercises.',
          prompt: options.source?.gaps?.userPrompt ?? gapPrompt,
          temperature: aiGeneration.temperature,
          ...(aiGeneration.maxTokens !== undefined ? { maxTokens: aiGeneration.maxTokens } : {}),
        });

        return {
          prompt: `Lücke ${gap.gapNumber}: Welches Wort passt hier?`,
          options: result.object.options,
          correctOptionId: result.object.correctOptionId,
          explanation: `Das richtige Wort ist "${gap.removedWord}".`,
        };
      });

      const questions = await Promise.all(questionPromises);

      return questions.map((q: any, index: number) => ({
        ...q,
        context: sourceWithGaps.gappedContext,
        title: sourceWithGaps.title,
        subtitle: sourceWithGaps.subtitle,
        theme: sourceWithGaps.theme,
        isExample: index === 0,
        exampleAnswer: index === 0 ? q.correctOptionId : undefined,
        difficulty,
        points: index === 0 ? 0 : defaultPoints,
        timeLimit: defaultTimeLimit,
        inputType: inferInputType(QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE),
        answerType: inferInputType(QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE),
      }));
    } catch (error) {
      console.error('GAP_TEXT session generation failed:', error);
      // Fall back to individual generation below
    }
  }

  // Fallback: generate questions individually
  const questions: any[] = [];
  const promises: Array<Promise<any>> = [];

  for (let i = 0; i < count; i++) {
    promises.push(
      generateQuestionWithAI({
        questionType,
        sessionType,
        difficulty,
        topicIndex: i,
        overrides: {
          aiGeneration: options.aiGeneration,
          defaults: options.defaults,
        },
      })
    );
  }

  try {
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error generating questions in parallel, retrying sequentially:', error);
    for (let i = 0; i < count; i++) {
      try {
        const question = await generateQuestionWithAI({
          questionType,
          sessionType,
          difficulty,
          topicIndex: i,
          overrides: {
            aiGeneration: options.aiGeneration,
            defaults: options.defaults,
          },
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
