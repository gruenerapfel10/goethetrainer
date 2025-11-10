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
import {
  generateRawSource,
  generateSourceWithGaps,
  generatePlannedGapPassage,
} from '@/lib/sessions/questions/source-generator';
import { generateNewsBackedAudioTranscript } from '@/lib/sessions/questions/audio-source';
import type {
  Question,
  QuestionResult,
  UserAnswer,
} from '@/lib/sessions/questions/question-types';
import { ModelId } from '@/lib/ai/model-registry';
import { customModel } from '@/lib/ai/models';
import type { NewsTopic } from '@/lib/news/news-topic-pool';
import { logAiRequest, logAiResponse } from '@/lib/ai/ai-logger';
import {
  ReadingAssessmentCategory,
  ReadingCategoryAllocationOptions,
  allocateReadingAssessmentCategories,
  getReadingAssessmentCategoryDefinition,
} from '@/lib/questions/assessment-categories';

type MCQAnswer = string | Record<string, string> | null;

const GAP_FOCUS_INSTRUCTIONS: Partial<Record<ReadingAssessmentCategory, string>> = {
  [ReadingAssessmentCategory.LEXICAL_NUANCE]: `
Lexikalische Nuance:
- Alle Optionen müssen gleiche Wortart und Register teilen.
- Nur eine Option darf die vom Kontext geforderte Wertung oder Konnotation exakt treffen.
`,
  [ReadingAssessmentCategory.COLLOCATION_CONTROL]: `
Kollokationskontrolle:
- Stelle die fehlende feste Verbindung wieder her (Verb+Nomen, Präposition, idiomatischer Ausdruck).
- Distraktoren sollen grammatisch möglich sein, aber eine andere, unpassende Kollokation bilden.
`,
  [ReadingAssessmentCategory.GRAMMAR_AGREEMENT]: `
Grammatik/Kongruenz:
- Variiere ausschließlich Kasus-, Genus- oder Numerusendungen.
- Nenne im Begründungstext das steuernde Bezugswort (z. B. Artikel, Präposition).
`,
  [ReadingAssessmentCategory.CONNECTOR_LOGIC]: `
Konnektorlogik:
- Nur die korrekte Option darf die intendierte Relation (Kontrast, Konsequenz, Einschränkung etc.) herstellen.
- Distraktoren müssen andere, aber plausible Relationen ausdrücken.
`,
  [ReadingAssessmentCategory.IDIOMATIC_EXPRESSION]: `
Idiome:
- Rekonstruiere exakt eine etablierte Redewendung.
- Distraktoren verändern einen Kernbestandteil und machen die Wendung unidiomatisch.
`,
  [ReadingAssessmentCategory.REGISTER_TONE]: `
Register & Ton:
- Alle Optionen beschreiben denselben Sachverhalt, unterscheiden sich aber in Formalität/Tonalität.
- Nur die korrekte Option harmoniert mit dem journalistisch-formellen Stil.
`,
  [ReadingAssessmentCategory.DISCOURSE_REFERENCE]: `
Diskursreferenz:
- Optionen verweisen auf unterschiedliche Referenten. Nur eine Option stellt Kohärenz mit dem vorherigen Satzteil her.
`,
  [ReadingAssessmentCategory.INSTITUTIONAL_CONTEXT]: `
Institutioneller Kontext:
- Verwende präzise Terminologie (politisch, juristisch, wirtschaftlich).
- Distraktoren sollen thematisch ähnlich sein, aber sachlich nicht passen.
`,
};

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
  categoryPlan?: ReadingAssessmentCategory[];
  categoryAllocation?: ReadingCategoryAllocationOptions;
}

interface GappedSourceConfig extends QuestionModuleSourceConfig {
  type: 'gapped_text';
  gapCount: number;
  optionsPerGap: number;
  optionStyle?: 'word' | 'statement';
  theme?: string;
  constructionMode?: 'auto' | 'planned';
  categoryPlan?: ReadingAssessmentCategory[];
  categoryAllocation?: ReadingCategoryAllocationOptions;
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

type GeneratedOptionRecord = {
  text: string;
  isCorrect: boolean;
  rationale: string;
  misconception?: string;
  criteria?: string;
};

type MCQSourceConfig =
  | TextSourceConfig
  | GappedSourceConfig
  | AudioGappedSourceConfig
  | AudioPassageSourceConfig;

interface CategoryAwareSourceConfig {
  categoryPlan?: ReadingAssessmentCategory[];
  categoryAllocation?: ReadingCategoryAllocationOptions;
}

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

function resolveAssessmentCategories(
  requiredCount: number,
  sourceConfig?: CategoryAwareSourceConfig
): ReadingAssessmentCategory[] {
  if (requiredCount <= 0) {
    return [];
  }
  const plan = sourceConfig?.categoryPlan ?? [];
  if (plan.length) {
    if (plan.length >= requiredCount) {
      return plan.slice(0, requiredCount);
    }
    const extended: ReadingAssessmentCategory[] = [];
    for (let index = 0; index < requiredCount; index += 1) {
      extended.push(plan[index % plan.length]);
    }
    return extended;
  }
  return allocateReadingAssessmentCategories(
    requiredCount,
    sourceConfig?.categoryAllocation
  );
}

interface ArticleQuestionGenerationOptions {
  article: Awaited<ReturnType<typeof generateRawSource>>;
  sessionType: SessionTypeEnum;
  difficulty: QuestionDifficulty;
  optionsPerQuestion: number;
  category: ReadingAssessmentCategory;
  customQuestionPrompt?: string;
  questionIndex: number;
  recordUsage?: (record: ModelUsageRecord) => void;
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

  const allocatedCategories = resolveAssessmentCategories(
    resolvedQuestionCount,
    sourceConfig
  );
  const questionType = resolveQuestionType(sessionType);
  const sourceReference = mapNewsTopicToSourceReference(rawSource.newsTopic);
  const questionPromises = Array.from({ length: resolvedQuestionCount }).map((_, index) => {
    const category = allocatedCategories[index];
    if (!category) {
      throw new Error(`Missing assessment category for question ${index + 1}`);
    }
    return generateArticleQuestion({
      article: rawSource,
      sessionType,
      difficulty,
      optionsPerQuestion,
      category,
      customQuestionPrompt: sourceConfig?.prompts?.questions,
      questionIndex: index,
      recordUsage,
    });
  });
  const generatedQuestions = await Promise.all(questionPromises);

  return generatedQuestions.map((entry, index) => ({
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
    options: entry.options,
    correctOptionId: entry.correctOptionId,
    explanation: entry.explanation,
    points: 1,
    moduleId: QuestionModuleId.MULTIPLE_CHOICE,
    moduleLabel: 'Multiple Choice',
    sourceReference,
    assessmentCategory: entry.assessmentCategory,
    optionRationales: entry.optionRationales,
  }));
}

async function generateArticleQuestion(
  options: ArticleQuestionGenerationOptions
) {
  const {
    article,
    optionsPerQuestion,
    category,
    customQuestionPrompt,
    questionIndex,
    recordUsage,
  } = options;
  const distractorCount = Math.max(1, optionsPerQuestion - 1);
  const questionSchema = buildStructuredQuestionSchema(distractorCount);
  const categoryDefinition = getReadingAssessmentCategoryDefinition(category);
  const categoryInstructions = categoryDefinition
    ? `Assessment category: ${categoryDefinition.label}
Beschreibung: ${categoryDefinition.description}
Generationshinweis: ${categoryDefinition.generationHint}`
    : '';
  const jsonExample = JSON.stringify(
    {
      prompt: 'Frage (Satzfragment, endet mit „…“)',
      correct: {
        text: 'korrekte Option',
        justification: 'Warum nur diese Option passt.',
        criteria: 'z. B. Kasus, Kollokation, Register',
      },
      distractors: Array.from({ length: distractorCount }, (_, idx) => ({
        text: `falsche Option ${idx + 1}`,
        rationale: 'Warum diese Option scheitert.',
        misconception: 'Typischer Denkfehler',
      })),
      explanation: 'Optionaler Hinweis',
    },
    null,
    2
  );

  const prompt = `
You will compose ONE Goethe C1 Leseteil Multiple-Choice question (Frage ${questionIndex + 1}).

Artikel-Infos:
- Thema: ${article.theme}
- Titel: ${article.title}
- Untertitel: ${article.subtitle}

Vollständiger Text:
${article.context}

${categoryInstructions}

Frageformat:
- Formuliere den Fragetext als Satzfragment (endet mit „…“).
- Genau ${optionsPerQuestion} Antwortoptionen, alle grammatisch zum Fragment passend.
- Optionen beginnen kleingeschrieben und sind max. 12 Wörter lang.
- Jedem Distraktor eine kurze Begründung + Misskonzeption zuordnen.
- Beziehe dich explizit auf Textsignale (Zitate) in den Begründungen.

Zusatzbriefing:
${customQuestionPrompt ?? '—'}

Return ONLY valid JSON genau in diesem Format:
${jsonExample}
`;

  logAiRequest(
    `ArticleQuestion[${questionIndex + 1}]`,
    `${optionsPerQuestion}-option payload`,
    {
      prompt,
      metadata: {
        theme: article.theme,
        category: categoryDefinition?.label ?? category,
      },
    }
  );

  const generation = await callWithRetry(() =>
    generateObject({
      model: customModel(DEFAULT_MODEL),
      schema: questionSchema,
      system:
        'Du bist Prüfungsautor:in für Goethe C1. Erstelle präzise MC-Fragen mit Begründungen.',
      prompt,
      temperature: 0.35,
    })
  );
  reportUsage(recordUsage, DEFAULT_MODEL, generation.usage);
  logAiResponse(`ArticleQuestion[${questionIndex + 1}]`, generation.object);

  const parsed = generation.object;
  const optionPool: GeneratedOptionRecord[] = [
    {
      text: parsed.correct.text.trim(),
      isCorrect: true,
      rationale: parsed.correct.justification.trim(),
      misconception: undefined,
      criteria: parsed.correct.criteria?.trim(),
    },
    ...parsed.distractors.map((distractor: any) => ({
      text: distractor.text.trim(),
      isCorrect: false,
      rationale: distractor.rationale.trim(),
      misconception: distractor.misconception?.trim(),
    })),
  ].filter(option => option.text.length > 0);

  enforceOptionQuality(optionPool, `Frage ${questionIndex + 1}`);

  const shuffled = optionPool
    .map(option => ({ option, sortKey: Math.random() }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((entry, idx) => ({
      id: OPTION_ID_ALPHABET[idx] ?? `opt_${idx}`,
      text: entry.option.text,
      isCorrect: entry.option.isCorrect,
      rationale: entry.option.isCorrect
        ? `${entry.option.rationale}${
            entry.option.criteria ? ` (${entry.option.criteria})` : ''
          }`
        : entry.option.rationale,
      misconception: entry.option.misconception,
    }));

  const correctOption = shuffled.find(option => option.isCorrect) ?? shuffled[0];
  const optionRationales = shuffled.map(option => ({
    optionId: option.id,
    rationale: option.rationale,
    isCorrect: option.isCorrect,
    misconception: option.misconception,
  }));

  const explanationParts = [
    categoryDefinition ? `Kategorie: ${categoryDefinition.label}` : null,
    parsed.explanation,
    parsed.correct.justification,
    parsed.correct.criteria ? `Kriterium: ${parsed.correct.criteria}` : null,
  ].filter(part => typeof part === 'string' && part.trim().length > 0);

  return {
    prompt: parsed.prompt.trim(),
    options: shuffled.map(option => ({ id: option.id, text: option.text })),
    correctOptionId: correctOption?.id ?? 'a',
    explanation: explanationParts.join('\n'),
    assessmentCategory: category,
    optionRationales,
  };
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

  let allocatedCategories: ReadingAssessmentCategory[] = [];
  let sourceWithGaps: Awaited<ReturnType<typeof generateSourceWithGaps>>;

  if (sourceConfig.constructionMode === 'planned') {
    allocatedCategories = resolveAssessmentCategories(
      sourceConfig.gapCount,
      sourceConfig
    );
    sourceWithGaps = await generatePlannedGapPassage(
      {
        categories: allocatedCategories,
        theme: sourceConfig.theme,
        teilLabel: typeof teilLabel === 'string' ? teilLabel : undefined,
        optionStyle: sourceConfig.optionStyle,
      },
      recordUsage
    );
  } else {
    sourceWithGaps = await generateSourceWithGaps(
      difficulty,
      {
        type: 'gapped_text',
        raw: { theme: sourceConfig.theme },
        gaps: {
          requiredCount: sourceConfig.gapCount,
        },
      },
      { teilLabel: typeof teilLabel === 'string' ? teilLabel : undefined },
      userId,
      recordUsage
    );
    allocatedCategories = resolveAssessmentCategories(
      sourceConfig.gapCount,
      sourceConfig
    );
  }

  const model = customModel(DEFAULT_MODEL);

  const gaps = sourceWithGaps.gaps.slice(0, sourceConfig.gapCount);
  const questionType = resolveQuestionType(sessionType);
  const distractorCount = Math.max(1, sourceConfig.optionsPerGap - 1);
  const gapSystemPrompt =
    'You are a German language expert who creates Goethe C1 gap-fill multiple-choice options. Always respond with JSON that matches the provided schema.';
  const jsonExample = JSON.stringify(
    {
      correctText: 'korrekte Option',
      correctReason: 'Kurze Begründung, warum nur diese Option passt.',
      correctCriteria: 'Kriterium oder Schwerpunkt',
      distractors: Array.from({ length: distractorCount }, (_, idx) => ({
        text: `falsche Option ${idx + 1}`,
        reason: 'Warum diese Option nicht passt.',
        misconception: 'Typisches Missverständnis',
      })),
    },
    null,
    2
  );

  const combinedSchema = z.object({
    gaps: z
      .array(
        z.object({
          gapNumber: z.number().int().positive(),
          correctText: z.string().min(1),
          correctReason: z.string().min(1),
          correctCriteria: z.string().optional(),
          distractors: z
            .array(
              z.object({
                text: z.string().min(1),
                reason: z.string().min(1),
                misconception: z.string().optional(),
              })
            )
            .length(distractorCount),
        })
      )
      .length(gaps.length),
  });

  const styleHint =
    sourceConfig.optionStyle === 'statement'
      ? 'Jede Option ist ein eigenständiger deutscher Satz (12-20 Wörter).'
      : 'Jede Option ist ein einzelnes Wort oder eine Kurzphrase (1-3 Wörter).';

  const gapBriefs = gaps.map((gap, index) => {
    const category = allocatedCategories[index];
    if (!category) {
      throw new Error(`Missing assessment category for gap ${gap.gapNumber}`);
    }
    const definition = getReadingAssessmentCategoryDefinition(category);
    return {
      gapNumber: gap.gapNumber,
      removedWord: gap.removedWord,
      category,
      label: definition?.label ?? category,
      description: definition?.description ?? '',
      hint: definition?.generationHint ?? '',
      focus:
        GAP_FOCUS_INSTRUCTIONS[definition?.id as ReadingAssessmentCategory] ?? '',
    };
  });

  const combinedPrompt = `
You will craft Goethe C1 Reading Teil 1 options for ${gaps.length} gaps in ONE response.

Passage (with gaps):
${sourceWithGaps.gappedContext}

Global rules:
- Verwende ${distractorCount + 1} Optionen pro Gap (${distractorCount} Distraktoren).
- ${styleHint}
- Alle Optionen müssen grammatisch zum Satz passen und den gleichen Register beibehalten.
- Jede Begründung zitiert oder paraphrasiert konkrete Textsignale.
- Distraktoren müssen typische Fehlannahmen benennen.

Return EXACT JSON:
{
  "gaps": [
    { "gapNumber": 1, "correctText": "...", "correctReason": "...", "correctCriteria": "...", "distractors": [...] },
    ...
  ]
}

Gap briefs:
${gapBriefs
  .map(
    brief => `GAP_${brief.gapNumber}:
- Originalwort: "${brief.removedWord}"
- Kategorie: ${brief.label}
- Beschreibung: ${brief.description}
- Hinweis: ${brief.hint}
${brief.focus ? `- Fokus: ${brief.focus}` : ''}`
  )
  .join('\n\n')}
`;

  logAiRequest(
    'GapOptions[Combined]',
    `GapOptions for ${gaps.length} gaps`,
    {
      system: gapSystemPrompt,
      prompt: combinedPrompt,
      metadata: {
        gapCount: gaps.length,
      },
    }
  );

  const combinedResult = await callWithRetry(() =>
    generateObject({
      model,
      schema: combinedSchema,
      system: gapSystemPrompt,
      prompt: combinedPrompt,
      temperature: 0.35,
    })
  );
  reportUsage(recordUsage, DEFAULT_MODEL, combinedResult.usage);
  logAiResponse('GapOptions[Combined]', combinedResult.object);

  const gapMap = new Map<number, (typeof combinedResult.object.gaps)[number]>();
  combinedResult.object.gaps.forEach(entry => gapMap.set(entry.gapNumber, entry));

  const sourceReference = mapNewsTopicToSourceReference(sourceWithGaps.newsTopic);

  const questions = await Promise.all(
    gaps.map(async (gap, index) => {
      const category = allocatedCategories[index];
      if (!category) {
        throw new Error(`Missing assessment category for gap ${gap.gapNumber}`);
      }
      const categoryDefinition = getReadingAssessmentCategoryDefinition(category);
      const entry = gapMap.get(gap.gapNumber);
      if (!entry) {
        throw new Error(`Missing generated options for GAP_${gap.gapNumber}`);
      }

      const parsedOptions = {
        correct: {
          text: entry.correctText.trim(),
          justification: entry.correctReason.trim(),
          criteria: entry.correctCriteria?.trim() ?? '',
        },
        distractors: entry.distractors.map(distractor => ({
          text: distractor.text.trim(),
          rationale: distractor.reason.trim(),
          misconception: distractor.misconception?.trim(),
        })),
      };

      const optionPool: GeneratedOptionRecord[] = [
        {
          text: parsedOptions.correct.text,
          isCorrect: true,
          rationale: parsedOptions.correct.justification,
          misconception: undefined,
          criteria: parsedOptions.correct.criteria,
        },
        ...parsedOptions.distractors.map(distractor => ({
          text: distractor.text,
          isCorrect: false,
          rationale: distractor.rationale,
          misconception: distractor.misconception,
        })),
      ].filter(option => option.text.length > 0);

      enforceOptionQuality(optionPool, `GAP_${gap.gapNumber}`);

      const shuffled = optionPool
        .map(option => ({ option, sortKey: Math.random() }))
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((entry, idx) => ({
          id: OPTION_ID_ALPHABET[idx] ?? `opt_${idx}`,
          text: entry.option.text,
          isCorrect: entry.option.isCorrect,
          rationale: entry.option.isCorrect
            ? `${entry.option.rationale}${
                entry.option.criteria ? ` (${entry.option.criteria})` : ''
              }`
            : entry.option.rationale,
          misconception: entry.option.misconception,
        }));

      const correctOption = shuffled.find(option => option.isCorrect) ?? shuffled[0];
      const optionRationales = shuffled.map(option => ({
        optionId: option.id,
        rationale: option.rationale,
        isCorrect: option.isCorrect,
        misconception: option.misconception,
      }));

      const explanationParts = [
        categoryDefinition ? `Kategorie: ${categoryDefinition.label}` : null,
        parsedOptions.correct.justification,
        parsedOptions.correct.criteria
          ? `Kriterium: ${parsedOptions.correct.criteria}`
          : null,
      ].filter(part => typeof part === 'string' && part.trim().length > 0);

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
        options: shuffled.map(option => ({ id: option.id, text: option.text })),
        correctOptionId: correctOption?.id ?? 'a',
        explanation: explanationParts.join('\n'),
        points: 1,
        moduleId: QuestionModuleId.MULTIPLE_CHOICE,
        moduleLabel: 'Multiple Choice',
        assessmentCategory: category,
        gaps: [
          {
            id: `GAP_${gap.gapNumber}`,
            options: shuffled.map(option => ({ id: option.id, text: option.text })),
            correctOptionId: correctOption?.id ?? 'a',
            assessmentCategory: category,
            optionRationales,
          },
        ],
        sourceReference,
      } as any;
    })
  );

  return questions;
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

function buildStructuredQuestionSchema(distractorCount: number) {
  return z.object({
    prompt: z.string().min(1),
    correct: z.object({
      text: z.string().min(1),
      justification: z.string().min(1),
      criteria: z.string().optional(),
    }),
    distractors: z
      .array(
        z.object({
          text: z.string().min(1),
          rationale: z.string().min(1),
          misconception: z.string().optional(),
        })
      )
      .length(distractorCount),
    explanation: z.string().optional(),
  });
}

function enforceOptionQuality(
  options: GeneratedOptionRecord[],
  contextLabel: string
) {
  if (!options.length) {
    throw new Error(`No options generated for ${contextLabel}`);
  }
  const correctCount = options.filter(option => option.isCorrect).length;
  if (correctCount !== 1) {
    throw new Error(
      `Expected exactly one correct option for ${contextLabel}, received ${correctCount}`
    );
  }
  const seen = new Set<string>();
  options.forEach(option => {
    const normalised = option.text.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!normalised) {
      throw new Error(`Empty option text detected for ${contextLabel}`);
    }
    if (seen.has(normalised)) {
      throw new Error(`Duplicate option "${option.text}" in ${contextLabel}`);
    }
    seen.add(normalised);
    if (!option.rationale || option.rationale.trim().length < 8) {
      throw new Error(`Missing rationale for option "${option.text}" in ${contextLabel}`);
    }
    if (!option.isCorrect) {
      if (!option.misconception || option.misconception.trim().length < 4) {
        throw new Error(
          `Distractor "${option.text}" in ${contextLabel} lacks a misconception`
        );
      }
    }
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
const DEFAULT_MODEL = ModelId.GPT_5;
const RETRY_ATTEMPTS = 0;
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
