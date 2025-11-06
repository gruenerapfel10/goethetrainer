import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { QuestionModuleId, type QuestionModule } from './types';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import {
  QuestionDifficulty,
  QuestionType,
  QuestionInputType,
} from '@/lib/sessions/questions/question-types';
import { generateSourceWithGaps } from '@/lib/sessions/questions/source-generator';
import { multipleChoiceConfig } from '@/lib/sessions/questions/configs/gap-text-multiple-choice.config';
import { multipleChoiceStandardConfig } from '@/lib/sessions/questions/configs/multiple-choice-standard.config';
import type {
  Question,
  QuestionResult,
  UserAnswer,
} from '@/lib/sessions/questions/question-types';

type MCQAnswer = string | Record<string, string> | null;

import type {
  QuestionModulePromptConfig,
  QuestionModuleRenderConfig,
  QuestionModuleSourceConfig,
} from './types';

interface MCQPromptConfig extends QuestionModulePromptConfig {
  instructions: string;
  allowHints: boolean;
}

interface MCQRenderConfig extends QuestionModuleRenderConfig {
  layout: 'horizontal' | 'vertical' | 'single_column';
  showSourceToggle: boolean;
  showExample: boolean;
  showOptionLabels: boolean;
}

interface TextSourceConfig extends QuestionModuleSourceConfig {
  type: 'text_passage';
  questionCount: number;
  optionsPerQuestion: number;
}

interface GappedSourceConfig extends QuestionModuleSourceConfig {
  type: 'gapped_text';
  gapCount: number;
  optionsPerGap: number;
}

interface AudioGappedSourceConfig extends QuestionModuleSourceConfig {
  type: 'audio_with_gaps';
  gapCount: number;
  durationSeconds: number;
  optionsPerGap: number;
}

type MCQSourceConfig = TextSourceConfig | GappedSourceConfig | AudioGappedSourceConfig;

function resolveQuestionType(sessionType: SessionTypeEnum): QuestionType {
  switch (sessionType) {
    case SessionTypeEnum.READING:
      return QuestionType.READING_COMPREHENSION;
    case SessionTypeEnum.LISTENING:
      return QuestionType.LISTENING_COMPREHENSION;
    default:
      return QuestionType.READING_COMPREHENSION;
  }
}

function resolvePointsPerQuestion(
  index: number,
  sourceConfig: MCQSourceConfig,
  maxPoints: number
): number {
  if (sourceConfig.type === 'gapped_text') {
    if (index === 0) {
      return 0; // Beispielfrage
    }
    const effectiveCount = Math.max(sourceConfig.gapCount - 1, 1);
    return maxPoints / effectiveCount;
  }

  return maxPoints;
}

function normaliseGapAnswer(value: unknown): Record<string, string> | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return { GAP_0: value };
  }
  if (typeof value === 'object') {
    const result: Record<string, string> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
      if (typeof raw === 'string' && raw.trim().length > 0) {
        result[key] = raw.trim();
      }
    });
    return Object.keys(result).length > 0 ? result : null;
  }
  return null;
}

function normaliseSingleSelection(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function mapToUserAnswer(
  questionId: string,
  answer: MCQAnswer,
  timeSpent: number,
  hintsUsed: number,
  previousAttempts = 0
): UserAnswer {
  return {
    questionId,
    answer,
    timeSpent,
    hintsUsed,
    attempts: previousAttempts + 1,
    timestamp: new Date(),
  };
}

async function markQuestion(
  question: Question,
  answer: MCQAnswer,
  userAnswer: UserAnswer
): Promise<QuestionResult> {
  const basePoints = question.points ?? 0;

  if (question.gaps && question.gaps.length > 0) {
    const record = typeof answer === 'object' && answer !== null ? answer : {};
    const gaps = question.gaps ?? [];
    let correctCount = 0;

    gaps.forEach(gap => {
      const expected = gap.correctOptionId ?? gap.correctAnswer;
      if (!expected) {
        return;
      }
      if (record[gap.id] === expected) {
        correctCount += 1;
      }
    });

    const ratio = correctCount / gaps.length;

    return {
      questionId: question.id,
      question,
      userAnswer,
      score: Math.round(basePoints * ratio),
      maxScore: basePoints,
      isCorrect: correctCount === gaps.length,
      feedback:
        correctCount === gaps.length
          ? 'Alle Lücken korrekt ausgefüllt.'
          : `Du hast ${correctCount} von ${gaps.length} Lücken korrekt ausgefüllt.`,
      markedBy: 'automatic',
    };
  }

  const selected = typeof answer === 'string' ? answer : null;
  const expectedId = question.correctOptionId ?? String(question.correctAnswer ?? '');
  const isCorrect = selected === expectedId;

  return {
    questionId: question.id,
    question,
    userAnswer,
    score: isCorrect ? basePoints : 0,
    maxScore: basePoints,
    isCorrect,
    feedback: isCorrect
      ? 'Richtige Antwort.'
      : 'Falsch. Bitte überprüfe deine Auswahl erneut.',
    markedBy: 'automatic',
  };
}

async function generateStandardMCQ(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty,
  questionCount: number
): Promise<Question[]> {
  const config = multipleChoiceStandardConfig;
  const { aiGeneration, sessionGenerationSchema } = config as any;
  const model = anthropic(aiGeneration.modelId);
  const userPrompt =
    aiGeneration.sessionUserPrompt?.replace('{{count}}', String(questionCount)) ??
    `Generate a German reading passage with ${questionCount} comprehension questions.`;

  const result = await generateObject({
    model,
    schema: sessionGenerationSchema,
    system: aiGeneration.sessionSystemPrompt || aiGeneration.systemPrompt,
    prompt: userPrompt,
    temperature: aiGeneration.temperature,
  });

  const data = result.object as any;
  const questions = data.questions.slice(0, questionCount);
  const questionType = resolveQuestionType(sessionType);

  return questions.map((q: any, index: number) => ({
    id: `${questionType}-${index}-${Date.now()}`,
    type: questionType,
    sessionType,
    difficulty,
    inputType: QuestionInputType.MULTIPLE_CHOICE,
    prompt: q.prompt,
    context: data.context,
    title: data.title,
    subtitle: data.subtitle,
    theme: data.theme,
    options: q.options,
    correctOptionId: q.correctOptionId,
    explanation: q.explanation,
    points: 1,
    moduleId: QuestionModuleId.MULTIPLE_CHOICE,
    moduleLabel: 'Multiple Choice',
  }));
}

async function generateGappedMCQ(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty,
  sourceConfig: GappedSourceConfig
): Promise<Question[]> {
  const sourceWithGaps = await generateSourceWithGaps(difficulty, {
    type: 'gapped_text',
    raw: {},
    gaps: {
      requiredCount: sourceConfig.gapCount,
    },
  });

  const config = multipleChoiceConfig as any;
  const { aiGeneration } = config;
  const model = anthropic(aiGeneration.modelId);

  const optionsSchema = z.object({
    options: z
      .array(
        z.object({
          id: z.string(),
          text: z.string(),
        })
      )
      .length(sourceConfig.optionsPerGap),
    correctOptionId: z.string(),
  });

  const gaps = sourceWithGaps.gaps.slice(0, sourceConfig.gapCount);
  const questionType = resolveQuestionType(sessionType);

  const questionPromises = gaps.map(async (gap, index) => {
    const gapPrompt = `Generate ${sourceConfig.optionsPerGap} multiple choice options for this gap fill exercise.

Gap number: ${gap.gapNumber}
Correct answer: "${gap.removedWord}"
Context: ${sourceWithGaps.gappedContext}

Create plausible options where one is the correct answer "${gap.removedWord}".
Return as JSON with id (0-${sourceConfig.optionsPerGap - 1}) and text.`;

    const result = await generateObject({
      model,
      schema: optionsSchema,
      system:
        'You are a German language expert creating multiple choice options for gap fill exercises.',
      prompt: gapPrompt,
      temperature: 0.7,
    });

    const points = index === 0 ? 0 : 1;

    return {
      id: `${questionType}-gap-${gap.gapNumber}-${Date.now()}`,
      type: questionType,
      sessionType,
      difficulty,
      inputType: QuestionInputType.MULTIPLE_CHOICE,
      prompt: `Lücke ${gap.gapNumber}: Welches Wort passt hier?`,
      context: sourceWithGaps.gappedContext,
      title: sourceWithGaps.title,
      subtitle: sourceWithGaps.subtitle,
      theme: sourceWithGaps.theme,
      options: result.object.options,
      correctOptionId: result.object.correctOptionId,
      explanation: `Das richtige Wort ist "${gap.removedWord}".`,
      isExample: index === 0,
      exampleAnswer: index === 0 ? result.object.correctOptionId : undefined,
      points,
      moduleId: QuestionModuleId.MULTIPLE_CHOICE,
      moduleLabel: 'Multiple Choice',
      gaps: [
        {
          id: `GAP_${gap.gapNumber}`,
          options: result.object.options.map((option: any) => option.id),
          correctOptionId: result.object.correctOptionId,
        },
      ],
    } as Question;
  });

  return Promise.all(questionPromises);
}

export const multipleChoiceModule: QuestionModule<
  MCQPromptConfig,
  MCQRenderConfig,
  MCQSourceConfig,
  MCQAnswer
> = {
  id: QuestionModuleId.MULTIPLE_CHOICE,
  label: 'Multiple Choice',
  description:
    'Standard multiple choice interactions, including Goethe-style gap text variants.',
  supportsSessions: [SessionTypeEnum.READING, SessionTypeEnum.LISTENING],
  defaults: {
    prompt: {
      instructions: 'Wählen Sie die richtige Antwort.',
      allowHints: false,
    },
    render: {
      layout: 'vertical',
      showSourceToggle: true,
      showExample: true,
      showOptionLabels: true,
    },
    source: {
      type: 'text_passage',
      questionCount: 7,
      optionsPerQuestion: 3,
    },
    scoring: {
      maxPoints: 1,
      strategy: 'single_select',
    },
  },
  clientRenderKey: 'MultipleChoice',
  async generate(context) {
    const { sessionType, difficulty, questionCount, sourceConfig } = context;

    if (sourceConfig.type === 'gapped_text') {
      const questions = await generateGappedMCQ(sessionType, difficulty, sourceConfig);
      return {
        questions: questions.slice(0, questionCount).map((question, index) => ({
          ...question,
          points: resolvePointsPerQuestion(index, sourceConfig, context.questionCount),
        })),
      };
    }

    if (sourceConfig.type === 'audio_with_gaps') {
      // TODO: Implement audio generation; fall back to gap text for now.
      const questions = await generateGappedMCQ(sessionType, difficulty, {
        type: 'gapped_text',
        gapCount: sourceConfig.gapCount,
        optionsPerGap: sourceConfig.optionsPerGap,
      });
      return {
        questions: questions.slice(0, questionCount).map((question, index) => ({
          ...question,
          audio: {
            duration: sourceConfig.durationSeconds,
            url: '', // Placeholder until audio generation implemented.
          },
          points: resolvePointsPerQuestion(index, sourceConfig, context.questionCount),
        })),
        metadata: {
          audioGenerationPending: true,
        },
      };
    }

    const questions = await generateStandardMCQ(
      sessionType,
      difficulty,
      questionCount || (sourceConfig as TextSourceConfig).questionCount
    );

    return {
      questions: questions.map(question => ({
        ...question,
        points: context.questionCount > 0 ? 1 : question.points,
      })),
    };
  },
  normaliseAnswer(value, question) {
    if (question.gaps && question.gaps.length > 0) {
      return normaliseGapAnswer(value);
    }
    return normaliseSingleSelection(value);
  },
  async mark({ question, answer, userAnswer }) {
    return markQuestion(question, answer, userAnswer);
  },
};
