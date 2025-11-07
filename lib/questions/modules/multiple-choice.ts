import { generateObject } from 'ai';
import { z } from 'zod';
import { QuestionModuleId, type QuestionModule } from './types';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import {
  QuestionDifficulty,
  QuestionType,
  QuestionInputType,
} from '@/lib/sessions/questions/question-types';
import { generateSourceWithGaps } from '@/lib/sessions/questions/source-generator';
import type {
  Question,
  QuestionResult,
  UserAnswer,
} from '@/lib/sessions/questions/question-types';
import { ModelId } from '@/lib/ai/model-registry';
import { customModel } from '@/lib/ai/models';

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
  optionStyle?: 'word' | 'statement';
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
  sourceConfig: MCQSourceConfig
): number {
  if (sourceConfig.type === 'gapped_text') {
    return index === 0 ? 0 : 1;
  }

  return 1;
}

function normaliseGapAnswer(
  value: unknown,
  question?: Question
): Record<string, string> | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const fallbackId =
      question?.gaps?.[0]?.id ??
      (Array.isArray(question?.gaps) && question.gaps.length > 0
        ? question.gaps[0]?.id
        : null) ??
      'GAP_0';
    return { [fallbackId]: trimmed };
  }
  if (typeof value === 'object') {
    const result: Record<string, string> = {};
    const allowedIds = new Set(
      (question?.gaps ?? [])
        .map(gap => gap.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
      if (typeof raw !== 'string') {
        return;
      }
      const trimmed = raw.trim();
      if (!trimmed) {
        return;
      }
      if (allowedIds.size === 0 || allowedIds.has(key)) {
        result[key] = trimmed;
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

    const totalGaps = gaps.length || 1;
    const allCorrect = correctCount === totalGaps;

    return {
      questionId: question.id,
      question,
      userAnswer,
      score: allCorrect ? basePoints : 0,
      maxScore: basePoints,
      isCorrect: allCorrect,
      feedback:
        allCorrect
          ? 'Alle Lücken korrekt ausgefüllt.'
          : `Du hast ${correctCount} von ${totalGaps} Lücken korrekt ausgefüllt.`,
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
  const model = customModel(DEFAULT_MODEL);
  const userPrompt = `Generate a German reading passage with ${questionCount} comprehension questions. Return JSON with theme, title, subtitle, context, and questions array.`;

  const generationSchema = z.object({
    theme: z.string(),
    title: z.string(),
    subtitle: z.string(),
    context: z.string(),
    questions: z.array(
      z.object({
        prompt: z.string(),
        options: z.array(z.object({ id: z.string(), text: z.string() })),
        correctOptionId: z.string(),
        explanation: z.string(),
      })
    ),
  });

  const result = await callWithRetry(() =>
    generateObject({
      model,
      schema: generationSchema,
      system: 'You are a German language expert creating reading comprehension questions.',
      prompt: userPrompt,
      temperature: 0.7,
    })
  );

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

  const model = customModel(DEFAULT_MODEL);

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
    const styleHint =
      sourceConfig.optionStyle === 'statement'
        ? 'Each option must be a full German sentence (12-20 words) that could plausibly fit as a complete statement. Avoid repeating the same beginning for each sentence.'
        : 'Each option should be a single word or short phrase (1-3 words) that could fit into the sentence.';

    const gapPrompt = `Generate ${sourceConfig.optionsPerGap} multiple choice options for this gap fill exercise.

Gap number: ${gap.gapNumber}
Correct answer: "${gap.removedWord}"
Context: ${sourceWithGaps.gappedContext}

${styleHint}
Return the result as JSON with "options": [{ "id": "a", "text": "..." }, ...] and "correctOptionId".`;

    const result = await callWithRetry(() =>
      generateObject({
        model,
        schema: optionsSchema,
        system:
          'You are a German language expert creating Goethe C1 gap fill options.',
        prompt: gapPrompt,
        temperature: 0.7,
      })
    );

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
    } as any;
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
          points: resolvePointsPerQuestion(index, sourceConfig),
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
          points: resolvePointsPerQuestion(index, sourceConfig),
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
        points: 1,
      })),
    };
  },
  normaliseAnswer(value, question) {
    if (question.gaps && question.gaps.length > 0) {
      return normaliseGapAnswer(value, question);
    }
    return normaliseSingleSelection(value);
  },
  async mark({ question, answer, userAnswer }) {
    return markQuestion(question, answer, userAnswer);
  },
};
const DEFAULT_MODEL = ModelId.CLAUDE_HAIKU_4_5;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_200;

async function callWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      if (attempt >= RETRY_ATTEMPTS) {
        throw error;
      }
      const delay = RETRY_DELAY_MS * attempt;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
