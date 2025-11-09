import { generateObject } from 'ai';
import { z } from 'zod';
import { QuestionModuleId, type QuestionModule, type ModelUsageRecord } from './types';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import {
  QuestionDifficulty,
  QuestionType,
  QuestionInputType,
  type AudioPlaybackPolicy,
} from '@/lib/sessions/questions/question-types';
import { generateRawSource, generateSourceWithGaps } from '@/lib/sessions/questions/source-generator';
import { generateNewsBackedAudioTranscript } from '@/lib/sessions/questions/audio-source';
import type {
  Question,
  QuestionResult,
  UserAnswer,
} from '@/lib/sessions/questions/question-types';
import { ModelId } from '@/lib/ai/model-registry';
import { customModel } from '@/lib/ai/models';
import type { NewsTopic } from '@/lib/news/news-topic-pool';

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
  theme?: string;
  teilLabel?: string;
  prompts?: {
    passage?: string;
    questions?: string;
  };
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
interface AudioPassageSourceConfig extends QuestionModuleSourceConfig {
  type: 'audio_passage';
  scenario?: string;
  listeningMode?: string;
  teilLabel?: string;
  questionCount?: number;
  optionsPerQuestion: number;
  playback?: AudioPlaybackPolicy;
  audioAsset?: {
    url?: string;
    title?: string;
    description?: string;
    durationSeconds?: number;
  };
  styleHint?: string;
  prompts?: {
    instructions?: string;
    exampleSummary?: string;
    transcript?: string;
    questions?: string;
  };
  conversationStyle?: 'podcast' | 'interview' | 'dialogue' | 'discussion' | 'monologue';
  speakerCount?: number;
  segmentCount?: number;
  tts?: {
    voiceHint?: string;
    locale?: string;
    rate?: number;
    pitch?: number;
  };
}

type MCQSourceConfig =
  | TextSourceConfig
  | GappedSourceConfig
  | AudioGappedSourceConfig
  | AudioPassageSourceConfig;

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

function withDefaultPlayback(config?: AudioPlaybackPolicy): AudioPlaybackPolicy {
  return {
    maxPlays: config?.maxPlays,
    allowPause: config?.allowPause ?? true,
    allowSeek: config?.allowSeek ?? config?.allowScrubbing ?? true,
    allowScrubbing: config?.allowScrubbing ?? config?.allowSeek ?? true,
    allowRestart: config?.allowRestart ?? true,
    allowSpeedChange: config?.allowSpeedChange ?? true,
  };
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

function reportUsage(
  recordUsage: ((record: ModelUsageRecord) => void) | undefined,
  modelId: string,
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    outputTokens?: number;
    inputTokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    totalTokens?: number;
  } | null
): void {
  if (!recordUsage || !usage) {
    return;
  }
  const inputTokens =
    usage.promptTokens ??
    usage.inputTokens ??
    usage.prompt_tokens ??
    0;
  const outputTokens =
    usage.completionTokens ??
    usage.outputTokens ??
    usage.completion_tokens ??
    0;
  if (!inputTokens && !outputTokens) {
    return;
  }
  recordUsage({
    modelId,
    inputTokens,
    outputTokens,
  });
}

async function generateStandardMCQ(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty,
  questionCount: number,
  sourceConfig?: TextSourceConfig,
  userId?: string,
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<Question[]> {
  const resolvedQuestionCount = Math.max(
    1,
    questionCount || sourceConfig?.questionCount || 7
  );
  const optionsPerQuestion = sourceConfig?.optionsPerQuestion ?? 3;

  const rawSource = await generateRawSource(
    difficulty,
    {
      theme: sourceConfig?.theme,
      systemPrompt: sourceConfig?.prompts?.passage,
    },
    sourceConfig?.teilLabel ? { teilLabel: sourceConfig.teilLabel } : undefined,
    userId,
    recordUsage
  );

  const questionSchema = z.object({
    questions: z.array(
      z.object({
        prompt: z.string(),
        options: z
          .array(z.object({ id: z.string(), text: z.string() }))
          .length(optionsPerQuestion),
        correctOptionId: z.string(),
        explanation: z.string().optional(),
      })
    ),
  });

  const questionPrompt = `Du erhältst einen deutschsprachigen Text und sollst Aufgaben für das Goethe-Zertifikat C1 erstellen.

Thema: ${rawSource.theme}
Titel: ${rawSource.title}
Untertitel: ${rawSource.subtitle}

Text:
${rawSource.context}

Erstelle ${resolvedQuestionCount} Multiple-Choice-Fragen mit jeweils ${optionsPerQuestion} Antwortoptionen.
Jede Frage muss direkt auf den Text Bezug nehmen und genau eine richtige Antwort haben.
${sourceConfig?.prompts?.questions ?? ''}`;

  const questionResult = await callWithRetry(() =>
    generateObject({
      model: customModel(DEFAULT_MODEL),
      schema: questionSchema,
      system:
        'Du bist Aufgabenentwickler:in für das Goethe-Zertifikat. Formuliere präzise Multiple-Choice-Fragen auf C1-Niveau.',
      prompt: questionPrompt,
      temperature: 0.55,
    })
  );
  reportUsage(recordUsage, DEFAULT_MODEL, questionResult.usage);

  const questions = questionResult.object.questions.slice(0, resolvedQuestionCount);
  const questionType = resolveQuestionType(sessionType);
  const sourceReference = mapNewsTopicToSourceReference(rawSource.newsTopic);

  return questions.map((entry, index) => {
    const normalised = normaliseGeneratedOptions(entry.options, entry.correctOptionId);
    return {
      id: `${questionType}-${Date.now()}-${index}`,
      type: questionType,
      sessionType,
      difficulty,
      inputType: QuestionInputType.MULTIPLE_CHOICE,
      prompt: entry.prompt,
      context: rawSource.context,
      title: rawSource.title,
      subtitle: rawSource.subtitle,
      theme: rawSource.theme,
      options: normalised.options,
      correctOptionId: normalised.correctOptionId,
      explanation: entry.explanation,
      points: 1,
      moduleId: QuestionModuleId.MULTIPLE_CHOICE,
      moduleLabel: 'Multiple Choice',
      sourceReference,
    };
  });
}

async function generateGappedMCQ(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty,
  sourceConfig: GappedSourceConfig,
  userId?: string,
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<Question[]> {
  const teilLabel =
    (sourceConfig as any)?.teilLabel ??
    (sourceConfig as any)?.label ??
    null;

  const sourceWithGaps = await generateSourceWithGaps(
    difficulty,
    {
      type: 'gapped_text',
      raw: {},
      gaps: {
        requiredCount: sourceConfig.gapCount,
      },
    },
    { teilLabel: typeof teilLabel === 'string' ? teilLabel : undefined },
    userId,
    recordUsage
  );

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
    reportUsage(recordUsage, DEFAULT_MODEL, result.usage);

    const normalised = normaliseGeneratedOptions(result.object.options, result.object.correctOptionId);

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
      options: normalised.options,
      correctOptionId: normalised.correctOptionId,
      explanation: `Das richtige Wort ist "${gap.removedWord}".`,
      points: 1,
      moduleId: QuestionModuleId.MULTIPLE_CHOICE,
      moduleLabel: 'Multiple Choice',
      gaps: [
        {
          id: `GAP_${gap.gapNumber}`,
          options: normalised.options.map(option => ({ id: option.id, text: option.text })),
          correctOptionId: normalised.correctOptionId,
        },
      ],
    } as any;
  });

  const sourceReference = mapNewsTopicToSourceReference(sourceWithGaps.newsTopic);
  return (await Promise.all(questionPromises)).map(question => ({
    ...question,
    sourceReference,
  }));
}

async function generateAudioPassageMCQ(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty,
  questionCount: number,
  sourceConfig: AudioPassageSourceConfig,
  userId?: string,
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<Question[]> {
  const requiredQuestions = Math.max(questionCount, 1);
  const transcript = await generateNewsBackedAudioTranscript(
    difficulty,
    {
      conversationStyle: sourceConfig.conversationStyle,
      speakerCount: sourceConfig.speakerCount,
      segmentCount: sourceConfig.segmentCount,
      listeningMode: sourceConfig.listeningMode,
      scenario: sourceConfig.scenario,
      prompts: { transcript: sourceConfig.prompts?.transcript },
      teilLabel: sourceConfig.teilLabel,
    },
    userId,
    recordUsage
  );

  const questionModel = customModel(DEFAULT_MODEL);
  const questionsSchema = z.object({
    questions: z.array(
      z.object({
        prompt: z.string(),
        options: z
          .array(
            z.object({
              id: z.string(),
              text: z.string(),
            })
          )
          .length(sourceConfig.optionsPerQuestion),
        correctOptionId: z.string(),
        explanation: z.string().optional(),
      })
    ),
  });

  const transcriptBody = transcript.segments
    .map((segment, index) => `${index + 1}. ${segment.speakerName}: ${segment.text}`)
    .join('\n');

  const questionPrompt = `
Du erstellst Aufgaben für Goethe-Zertifikat C1 Hören (${sourceConfig.teilLabel ?? 'Teil'}).

Vorgaben:
- Schwierigkeitsgrad: ${difficulty}
- Antwortoptionen je Frage: ${sourceConfig.optionsPerQuestion}
- Format: ${sourceConfig.listeningMode ?? 'Hörtext'}

Transkript:
${transcriptBody}

${sourceConfig.prompts?.questions ?? ''}

Erstelle ${requiredQuestions} Aufgaben, stelle sicher, dass die Antworten eindeutig aus dem Transkript hervorgehen. Wenn ein Beispiel verlangt ist, markiere die erste Aufgabe so, dass sie eindeutig als Beispiel verwendet werden kann (wir kennzeichnen sie später).`;

  const questionResult = await callWithRetry(() =>
    generateObject({
      model: questionModel,
      schema: questionsSchema,
      system:
        'Du bist Aufgabenentwickler:in für Hörverstehensprüfungen und formulierst präzise Multiple-Choice-Fragen.',
      prompt: questionPrompt,
      temperature: 0.55,
    })
  );
  reportUsage(recordUsage, DEFAULT_MODEL, questionResult.usage);

  if (
    !Array.isArray(questionResult.object.questions) ||
    questionResult.object.questions.length < requiredQuestions
  ) {
    throw new Error('Audio question generator returned too few questions');
  }

  const playback = withDefaultPlayback(sourceConfig.playback);
  const ttsConfig = sourceConfig.tts ?? {};
  const audioSource = {
    title: sourceConfig.audioAsset?.title ?? transcript.title,
    description: sourceConfig.audioAsset?.description ?? transcript.description,
    url: sourceConfig.audioAsset?.url ?? '',
    durationSeconds: sourceConfig.audioAsset?.durationSeconds ?? transcript.durationSeconds,
    transcript: transcript.transcript,
    transcriptLanguage: 'de-DE',
    segments: transcript.segments.slice(0, 6).map((segment, index) => ({
      timestamp: `S${index + 1}`,
      summary: `${segment.speakerName}: ${segment.text.slice(0, 140)}${
        segment.text.length > 140 ? '…' : ''
      }`,
    })),
    status: 'ready' as const,
    playback,
    dialogue: transcript.segments,
    generatedAudio: sourceConfig.audioAsset?.url
      ? undefined
      : {
          provider: 'web_speech' as const,
          locale: ttsConfig.locale ?? 'de-DE',
          voiceHint: ttsConfig.voiceHint ?? transcript.speakingStyle,
          rate: ttsConfig.rate ?? 1,
          pitch: ttsConfig.pitch ?? 1,
          segments: transcript.segments,
        },
  };

  const questionType = resolveQuestionType(sessionType);

  return questionResult.object.questions.slice(0, requiredQuestions).map((entry, index) => {
    const normalised = normaliseGeneratedOptions(entry.options, entry.correctOptionId);
    return {
      id: `${questionType}-audio-${Date.now()}-${index}`,
      type: questionType,
      sessionType,
      difficulty,
      inputType: QuestionInputType.MULTIPLE_CHOICE,
      prompt: entry.prompt,
      context: transcript.transcript,
      title: transcript.title,
      subtitle: transcript.description,
      theme: transcript.theme,
      options: normalised.options,
      correctOptionId: normalised.correctOptionId,
      explanation: entry.explanation,
      points: 1,
      audioSource,
      instructions: sourceConfig.prompts?.instructions,
    };
  });
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
    const {
      sessionType,
      difficulty,
      questionCount,
      sourceConfig,
      userId,
      recordUsage,
    } = context;

    if (sourceConfig.type === 'gapped_text') {
      const questions = await generateGappedMCQ(
        sessionType,
        difficulty,
        sourceConfig,
        userId,
        recordUsage
      );
      return {
        questions: questions.slice(0, questionCount).map((question, index) => ({
          ...question,
          points: resolvePointsPerQuestion(index, sourceConfig),
        })),
      };
    }

    if (sourceConfig.type === 'audio_passage') {
      const targetCount =
        questionCount ||
        sourceConfig.questionCount ||
        DEFAULT_AUDIO_QUESTION_COUNT;
      const requiredCount = targetCount;
      const questions = await generateAudioPassageMCQ(
        sessionType,
        difficulty,
        targetCount,
        sourceConfig,
        userId,
        recordUsage
      );

      return {
        questions: questions.slice(0, requiredCount).map((question, index) => ({
          ...question,
          points: 1,
        })),
      };
    }

    if (sourceConfig.type === 'audio_with_gaps') {
      // TODO: Implement audio generation; fall back to gap text for now.
      const questions = await generateGappedMCQ(
        sessionType,
        difficulty,
        {
          type: 'gapped_text',
          gapCount: sourceConfig.gapCount,
          optionsPerGap: sourceConfig.optionsPerGap,
        },
        userId,
        recordUsage
      );
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
    questionCount || (sourceConfig as TextSourceConfig).questionCount,
    sourceConfig as TextSourceConfig,
    userId,
    recordUsage
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
const DEFAULT_AUDIO_QUESTION_COUNT = 6;
const OPTION_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

interface NormalisedOptionsResult {
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
}

function normaliseGeneratedOptions(
  rawOptions: Array<{ id?: string; text?: string }> | undefined,
  rawCorrectId?: string
): NormalisedOptionsResult {
  const fallbackOptions = rawOptions?.length ? rawOptions : [];
  const prepared = fallbackOptions.map((option, index) => {
    const id = option.id ?? `opt_${index}`;
    const text = option.text ?? id;
    return {
      id,
      text,
      isCorrect: rawCorrectId ? rawCorrectId === id : false,
    };
  });

  if (!prepared.some(option => option.isCorrect) && prepared.length > 0) {
    prepared[0].isCorrect = true;
  }

  const shuffled = prepared
    .map(option => ({ ...option, sortKey: Math.random() }))
    .sort((a, b) => a.sortKey - b.sortKey);

  const remapped = shuffled.map((option, index) => {
    const optionId = OPTION_ID_ALPHABET[index] ?? `opt_${index}`;
    return {
      id: optionId,
      text: option.text,
      isCorrect: option.isCorrect,
    };
  });

  const correctOption = remapped.find(option => option.isCorrect) ?? remapped[0];

  return {
    options: remapped.map(({ id, text }) => ({ id, text })),
    correctOptionId: correctOption?.id ?? 'a',
  };
}

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
function mapNewsTopicToSourceReference(topic?: NewsTopic | null) {
  if (!topic) {
    return undefined;
  }
  return {
    title: topic.headline,
    summary: topic.summary,
    url: topic.url,
    provider: topic.source,
    publishedAt: topic.publishedAt,
  };
}
