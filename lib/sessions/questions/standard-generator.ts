import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { QuestionTypeName } from './question-enums';
import { multipleChoiceConfig } from './configs/multiple-choice.config';
import type { QuestionDifficulty } from './question-types';
import { SessionTypeEnum } from '../session-registry';

export const maxDuration = 30;

interface QuestionConfig {
  name: QuestionTypeName;
  displayName: string;
  generationSchema: z.ZodSchema;
  batchGenerationSchema?: z.ZodSchema;
  supportedSessions?: SessionTypeEnum[];
  aiGeneration: {
    modelId: string;
    temperature: number;
    maxTokens?: number;
    systemPrompt: string;
    userPrompt: string;
    batchSystemPrompt?: string;
    batchUserPrompt?: string;
  };
  defaultPoints: number;
  defaultTimeLimit: number;
  markingMethod: string;
}

// Registry of question configs
const QUESTION_CONFIGS: Record<string, QuestionConfig> = {
  [QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE]: multipleChoiceConfig as QuestionConfig,
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
      points: questionData.points || config.defaultPoints,
      timeLimit: questionData.timeLimit || config.defaultTimeLimit,
      markingMethod: config.markingMethod,
    };

    return generatedQuestion;
  } catch (error) {
    console.error('Error generating question with AI:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate ${questionType} question: ${errorMessage}`);
  }
}

/**
 * Generate multiple questions for a session
 */
/**
 * Generate all questions at once using batch generation
 */
export async function generateQuestionsBatch(
  _sessionType: SessionTypeEnum,
  _difficulty: QuestionDifficulty = 'intermediate' as QuestionDifficulty
): Promise<any> {
  // For now, only support multiple choice batch generation
  const questionType = QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE;
  const config = QUESTION_CONFIGS[questionType];

  if (!config) {
    throw new Error(`No configuration found for question type: ${questionType}`);
  }

  const { aiGeneration } = config;

  // Check if batch generation is supported
  if (!aiGeneration.batchSystemPrompt || !config.batchGenerationSchema) {
    throw new Error(`Batch generation not supported for question type: ${questionType}`);
  }

  // Initialize the model
  const model = anthropic(aiGeneration.modelId);

  try {
    // Generate all questions at once
    const generateParams: any = {
      model,
      schema: config.batchGenerationSchema,
      system: aiGeneration.batchSystemPrompt,
      prompt: aiGeneration.batchUserPrompt,
      temperature: aiGeneration.temperature,
      mode: 'tool',
    };

    if (aiGeneration.maxTokens) {
      generateParams.maxTokens = aiGeneration.maxTokens;
    }

    const result = await generateObject(generateParams);

    return result.object;
  } catch (error) {
    console.error('Error generating batch questions with AI:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate batch questions: ${errorMessage}`);
  }
}

export async function generateQuestionsForSession(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty = 'intermediate' as QuestionDifficulty,
  count: number = 1,
  questionTypes?: QuestionTypeName[]
): Promise<any[]> {
  // For reading session with 9 questions, use batch generation (1 context + 9 questions)
  const isReadingSession = count === 9 && sessionType === SessionTypeEnum.READING;

  if (isReadingSession) {
    console.log('Generating 9 questions from 1 context using batch generation...');
    try {
      const batchResult = await generateQuestionsBatch(sessionType, difficulty);
      const { context, questions } = batchResult;

      // Transform batch result into array of questions with shared context
      const questionsWithContext = questions.map((q: any, index: number) => ({
        ...q,
        context,
        isExample: index === 0, // First question is example
        exampleAnswer: index === 0 ? q.correctOptionId : undefined,
        difficulty,
        points: 10,
        timeLimit: 60,
      }));

      return questionsWithContext;
    } catch (error) {
      console.error('Batch generation failed:', error);
      throw error; // Don't fall back for reading sessions, fail fast
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

/**
 * Validate a generated question against its schema
 */
export function validateGeneratedQuestion(
  questionType: QuestionTypeName,
  questionData: unknown
): boolean {
  const config = QUESTION_CONFIGS[questionType];
  if (!config) {
    return false;
  }

  try {
    config.generationSchema.parse(questionData);
    return true;
  } catch (error) {
    console.error(`Validation failed for ${questionType}:`, error);
    return false;
  }
}