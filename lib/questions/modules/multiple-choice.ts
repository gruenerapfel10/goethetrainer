import { generateObject } from 'ai';
import { z } from 'zod';
import { QuestionModuleId, type QuestionModule, type ModelUsageRecord } from './types';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import {
  type QuestionDifficulty,
  QuestionType,
  QuestionInputType,
  type AudioPlaybackPolicy,
} from '@/lib/sessions/questions/question-types';
import {
  generateRawSource,
  generateSourceWithGaps,
  generatePlannedGapPassage,
  generatePlannedArticleQuestionSet,
  generatePlannedSentenceInsertionSet,
} from '@/lib/sessions/questions/source-generator';
import { mapLevelToQuestionDifficulty } from '@/lib/levels/utils';
import { buildGeneratedAudio, synthesizeText, TTSProvider } from '@/services/tts';
import type {
  Question,
  QuestionResult,
  UserAnswer,
} from '@/lib/sessions/questions/question-types';
import { ModelId } from '@/lib/ai/model-registry';
import { customModel } from '@/lib/ai/models';
import type { NewsTopic } from '@/lib/news/news-topic-pool';
import { logAiRequest, logAiResponse } from '@/lib/ai/ai-logger';
import type { LevelProfile } from '@/lib/levels/level-profiles';
import {
  ReadingAssessmentCategory,
  type ReadingCategoryAllocationOptions,
  allocateReadingAssessmentCategories,
  getReadingAssessmentCategoryDefinition,
} from '@/lib/questions/assessment-categories';

type MCQAnswer = string | Record<string, string> | null;

const GAP_FOCUS_INSTRUCTIONS: Partial<Record<ReadingAssessmentCategory, string>> = {
  [ReadingAssessmentCategory.FORM_GRAMMAR]: `
Form & Grammatik:
- Variiere ausschließlich Formen (Kasus/Genus/Numerus, Wortstellung, Flexion).
- Nenne das steuernde Bezugswort (Artikel, Präposition, Verb).
Bewerte schwarz-weiß: Nur die Form mit korrekter Kongruenz ist richtig, alle anderen sind falsch.
`,
  [ReadingAssessmentCategory.COHESION_CONNECTORS]: `
Kohäsion & Konnektoren:
- Nur eine Option stellt die intendierte Relation her (Kontrast, Konsequenz, Addition, Verweis).
- Distraktoren bleiben grammatisch, drücken aber andere Relationen aus.
Arbeite wie ein:e Redakteur:in – nur die logisch passende Verbindung ist korrekt.
`,
  [ReadingAssessmentCategory.LEXIS_REGISTER]: `
Lexikalische Präzision & Register:
- Alle Optionen sind semantisch verwandt, unterscheiden sich in Nuance, Kollokation und Formalität.
- Nur eine Option passt idiomatisch und stilistisch zum Kontext.
Keine Partialkredite: Entweder trifft die Option Nuance & Register exakt oder nicht.
`,
  [ReadingAssessmentCategory.GIST_STRUCTURE]: `
Kernaussage & Struktur:
- Option muss die Hauptidee oder Abschnittsrolle korrekt widerspiegeln.
- Distraktoren greifen Nebendetails oder tangentiale Ideen auf.
Bewerte nach Hauptfunktion, nicht nach Oberflächenähnlichkeit.
`,
  [ReadingAssessmentCategory.DETAIL_EVIDENCE]: `
Details & Evidenz:
- Optionen variieren in konkreten Fakten (Zahlen, Daten, Entitäten).
- Nur eine Option stimmt exakt mit dem Detail überein.
Kleinste Abweichungen machen die Option falsch.
`,
  [ReadingAssessmentCategory.INFERENCE_STANCE]: `
Inference & Haltung:
- Korrekte Option erfasst implizite Bedeutung oder Sprecher:innen-Haltung.
- Distraktoren wirken wörtlich plausibel, verfehlen aber Intention oder logische Folgerung.
Wähle die Option, die das unausgesprochene Fazit oder die Haltung widerspiegelt.
`,
};

import type {
  QuestionModulePromptConfig,
  QuestionModuleRenderConfig,
  QuestionModuleSourceConfig,
} from './types';
import {
  generateListeningScript,
  type ListeningStyleId,
} from '@/lib/sessions/questions/listening-style-factory';

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
  constructionMode?: 'auto' | 'planned_article';
  levelProfile?: LevelProfile;
  levelId?: string | null;
  prompts?: {
    passage?: string;
    questions?: string;
  };
  categoryPlan?: ReadingAssessmentCategory[];
  categoryAllocation?: ReadingCategoryAllocationOptions;
}

interface GappedSourceConfig extends QuestionModuleSourceConfig {
  type: 'gapped_text';
  gapCount?: number;
  optionsPerGap?: number;
  optionStyle?: 'word' | 'statement';
  theme?: string;
  constructionMode?: 'auto' | 'planned' | 'planned_sentence_pool';
  categoryPlan?: ReadingAssessmentCategory[];
  categoryAllocation?: ReadingCategoryAllocationOptions;
  levelProfile?: LevelProfile;
  levelId?: string | null;
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
   theme?: string;
   levelProfile?: LevelProfile;
   levelId?: string | null;
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
    provider?: TTSProvider;
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
  const cfg: TextSourceConfig = sourceConfig ?? ({} as TextSourceConfig);
  const levelMappedDifficulty = mapLevelToQuestionDifficulty(cfg.levelId as any);
  const effectiveDifficulty = levelMappedDifficulty ?? difficulty;
  const resolvedQuestionCount = Math.max(
    1,
    questionCount ||
      cfg.questionCount ||
      cfg.levelProfile?.questionCount ||
      7
  );
  const optionsPerQuestion =
    cfg.optionsPerQuestion ??
    cfg.levelProfile?.optionsPerItem ??
    3;
  const effectiveGapCount =
    cfg.gapCount ??
    cfg.levelProfile?.gapCount ??
    cfg.questionCount ??
    8;

  if (cfg.constructionMode === 'planned_article') {
    const planned = await generatePlannedArticleQuestionSet(
      {
        questionCount: resolvedQuestionCount,
        optionsPerQuestion,
        theme: cfg.theme,
        teilLabel: cfg.teilLabel,
        difficulty: effectiveDifficulty,
        userId,
        levelId: cfg.levelId ?? undefined,
        targetWordCountRange: cfg.levelProfile?.passageLength,
      },
      recordUsage
    );
    const questionType = resolveQuestionType(sessionType);
    const sourceReference = mapNewsTopicToSourceReference(planned.newsTopic);
    return planned.questions.map((entry, index) => {
      const normalised = normaliseGeneratedOptions(entry.options, entry.correctOptionId);
      return {
        id: `${questionType}-planned-${Date.now()}-${index}`,
        type: questionType,
        sessionType,
        difficulty,
        inputType: QuestionInputType.MULTIPLE_CHOICE,
        prompt: entry.prompt,
        context: planned.context,
        title: planned.title,
        subtitle: planned.subtitle,
        theme: planned.theme,
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

  const rawSource = await generateRawSource(
    effectiveDifficulty,
    {
      theme: cfg.theme,
      systemPrompt: cfg.prompts?.passage,
    },
    cfg.teilLabel
      ? { teilLabel: cfg.teilLabel, levelId: cfg.levelId ?? null }
      : { levelId: cfg.levelId ?? null },
    userId,
    recordUsage
  );

  const allocatedCategories = resolveAssessmentCategories(
    resolvedQuestionCount,
    cfg
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
      difficulty: effectiveDifficulty,
      optionsPerQuestion,
      category,
      customQuestionPrompt: cfg.prompts?.questions,
      questionIndex: index,
      recordUsage,
    });
  });
  const generatedQuestions = await Promise.all(questionPromises);

  return generatedQuestions.map((entry, index) => ({
    id: `${questionType}-${Date.now()}-${index}`,
    type: questionType,
    sessionType,
    difficulty: effectiveDifficulty,
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
You will compose ONE reading Multiple-Choice question (Frage ${questionIndex + 1}).

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
        'Du bist Prüfungsautor:in. Erstelle präzise MC-Fragen mit Begründungen.',
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
  const effectiveDifficulty = mapLevelToQuestionDifficulty(sourceConfig.levelId as any) ?? difficulty;
  const effectiveGapCount: number = Number(
    sourceConfig.gapCount ??
      sourceConfig.levelProfile?.gapCount ??
      sourceConfig.questionCount ??
      8
  );
  const optionsPerGap =
    sourceConfig.optionsPerGap ??
    sourceConfig.levelProfile?.optionsPerItem ??
    3;
  const teilLabel =
    (sourceConfig as any)?.teilLabel ??
    (sourceConfig as any)?.label ??
    null;

  let allocatedCategories: ReadingAssessmentCategory[] = [];
  let sourceWithGaps: Awaited<ReturnType<typeof generateSourceWithGaps>>;

  if (sourceConfig.constructionMode === 'planned_sentence_pool') {
    const gapBase = Number.isFinite(effectiveGapCount) ? Number(effectiveGapCount) : 0;
    const optionBase = Number.isFinite(optionsPerGap) ? Number(optionsPerGap) : gapBase;
    const sentencePoolSize = Math.max(gapBase + 2, optionBase + 2);
    const sentencePlan = await generatePlannedSentenceInsertionSet(
      {
        sentencePoolSize:
          (sourceConfig as any)?.sentencePoolSize ??
          sentencePoolSize,
        gapCount: gapBase,
        theme: sourceConfig.theme,
        teilLabel: typeof teilLabel === 'string' ? teilLabel : undefined,
        difficulty: effectiveDifficulty,
        userId,
        levelId: sourceConfig.levelId ?? null,
        targetWordCountRange: sourceConfig.levelProfile?.passageLength,
      },
      recordUsage
    );
    const poolOptions = sentencePlan.sentences.map(sentence => ({
      id: sentence.id,
      text: sentence.text,
    }));
    const questionType = resolveQuestionType(sessionType);
    const question: Question = {
      id: `${questionType}-sentence-${Date.now()}`,
      type: questionType,
      sessionType,
      difficulty,
      inputType: QuestionInputType.MULTIPLE_CHOICE,
      prompt: 'Fügen Sie die passenden Sätze ein.',
      context: sentencePlan.context,
      title: sentencePlan.title,
      subtitle: sentencePlan.subtitle,
      theme: sentencePlan.theme,
      options: poolOptions,
      correctOptionId: undefined,
      explanation: undefined,
      points: sentencePlan.gaps.length,
      moduleId: QuestionModuleId.MULTIPLE_CHOICE,
      moduleLabel: 'Multiple Choice',
      gaps: sentencePlan.gaps.map(gap => ({
        id: `GAP_${gap.gapNumber}`,
        options: poolOptions.slice(0, optionsPerGap).map(option => ({ ...option })),
        correctOptionId: gap.solution,
      })),
      presentation: {
        intro: sentencePlan.intro,
        sentencePool: poolOptions,
      },
    } as any;
    const sourceReference = mapNewsTopicToSourceReference(sentencePlan.newsTopic);
    return [
      {
        ...question,
        sourceReference,
      },
    ];
  } else if (sourceConfig.constructionMode === 'planned') {
    allocatedCategories = resolveAssessmentCategories(
      effectiveGapCount,
      sourceConfig
    );
    sourceWithGaps = await generatePlannedGapPassage(
      {
        categories: allocatedCategories,
        theme: sourceConfig.theme,
        teilLabel: typeof teilLabel === 'string' ? teilLabel : undefined,
        optionStyle: sourceConfig.optionStyle,
        difficulty: effectiveDifficulty,
        userId,
        targetWordCountRange: sourceConfig.levelProfile?.passageLength,
        levelId: sourceConfig.levelId ?? null,
      },
      recordUsage
    );
  } else {
    sourceWithGaps = await generateSourceWithGaps(
      effectiveDifficulty,
      {
        type: 'gapped_text',
        raw: {
          theme: sourceConfig.theme,
          targetWordCountRange: sourceConfig.levelProfile?.passageLength,
        },
        gaps: {
          requiredCount: effectiveGapCount,
        },
      },
      { teilLabel: typeof teilLabel === 'string' ? teilLabel : undefined, levelId: sourceConfig.levelId ?? null },
      userId,
      recordUsage
    );
    allocatedCategories = resolveAssessmentCategories(effectiveGapCount, sourceConfig);
  }

  const model = customModel(DEFAULT_MODEL);

  const gaps = sourceWithGaps.gaps.slice(0, effectiveGapCount);
  const questionType = resolveQuestionType(sessionType);
  const distractorCount = Math.max(1, optionsPerGap - 1);
  const gapSystemPrompt =
    'You are a German language expert who creates exam-style gap-fill multiple-choice options. Always respond with JSON that matches the provided schema.';
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
            .min(distractorCount),
        })
      )
      .length(gaps.length),
  });

  const styleHint =
    sourceConfig.optionStyle === 'statement'
      ? 'Jede Option ist ein eigenständiger deutscher Satz (12-20 Wörter).'
      : 'Jede Option ist ein einzelnes Wort oder eine Kurzphrase (1-3 Wörter).';

  const gapBriefs = gaps.map((gap, index) => {
    const category = allocatedCategories[index] ?? allocatedCategories[allocatedCategories.length - 1];
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
You will craft reading gap-fill options for ${gaps.length} gaps in ONE response.

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
          misconception:
            distractor.misconception?.trim() ??
            `Typische Fehleinschätzung: ${distractor.reason.trim()}`,
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
  const resolvedQuestionCount = Math.max(
    questionCount ||
      sourceConfig.questionCount ||
      sourceConfig.levelProfile?.questionCount ||
      DEFAULT_AUDIO_QUESTION_COUNT,
    1
  );

  const optionsPerQuestion =
    sourceConfig.optionsPerQuestion ??
    sourceConfig.levelProfile?.optionsPerItem ??
    3;

  const planned = await generatePlannedArticleQuestionSet(
    {
      questionCount: resolvedQuestionCount,
      optionsPerQuestion,
      theme: sourceConfig.scenario ?? sourceConfig.theme,
      teilLabel: sourceConfig.teilLabel,
      difficulty,
      userId,
      levelId: sourceConfig.levelId ?? undefined,
      targetWordCountRange: sourceConfig.levelProfile?.passageLength,
    },
    recordUsage
  );

  const questionType = resolveQuestionType(sessionType);
  const playback = withDefaultPlayback(sourceConfig.playback);
  const ttsConfig = sourceConfig.tts ?? {};
  const ttsProvider =
    process.env.AWS_TTS_BUCKET && (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION)
      ? TTSProvider.AWS_POLLY
      : TTSProvider.BROWSER_SPEECH;

  let synthesizedUrl: string | null = null;
  try {
    const synthResult = await synthesizeText(planned.context, {
      provider: ttsProvider,
      locale: ttsConfig.locale ?? 'de-DE',
      voiceId: selectPollyVoiceId(ttsConfig.voiceHint),
    });
    synthesizedUrl = synthResult?.url ?? null;
  } catch (error) {
    console.warn('[tts] synthesis failed, falling back to generatedAudio', error);
  }

  // Build structured listening script based on desired style
  const listeningStyle: ListeningStyleId =
    (sourceConfig.conversationStyle as ListeningStyleId) ?? 'monologue';
  const script = await generateListeningScript({
    style: listeningStyle,
    theme: sourceConfig.scenario ?? sourceConfig.theme,
    headline: planned.title,
    summary: planned.subtitle,
    speakerCount: sourceConfig.speakerCount,
    segmentCount: sourceConfig.segmentCount,
    levelId: sourceConfig.levelId ?? null,
    baseContext: planned.context,
  });

  const transcriptText = script.segments
    .map(seg => {
      const speaker = script.speakers.find(s => s.id === seg.speakerId);
      const label = speaker?.name ?? seg.speakerId;
      return `${label}: ${seg.text}`;
    })
    .join('\n');

  const audioSource = {
    title: sourceConfig.audioAsset?.title ?? script.title,
    description: sourceConfig.audioAsset?.description ?? script.subtitle,
    url: sourceConfig.audioAsset?.url ?? synthesizedUrl ?? '',
    durationSeconds: sourceConfig.audioAsset?.durationSeconds ?? undefined,
    transcript: transcriptText,
    transcriptLanguage: 'de-DE',
    segments: script.segments.map((seg, idx) => {
      const speaker = script.speakers.find(s => s.id === seg.speakerId);
      const label = speaker?.name ?? seg.speakerId;
      const summaryText = `${label}: ${seg.text}`;
      return {
        timestamp: `S${idx + 1}`,
        summary: summaryText.slice(0, 140) + (summaryText.length > 140 ? '…' : ''),
      };
    }),
    status: 'ready' as const,
    playback,
    dialogue: script.segments.map(seg => {
      const speaker = script.speakers.find(s => s.id === seg.speakerId);
      return {
        speakerId: seg.speakerId,
        speakerName: speaker?.name ?? seg.speakerId,
        role: speaker?.role ?? sourceConfig.listeningMode ?? 'Hörtext',
        text: seg.text,
      };
    }),
    generatedAudio: sourceConfig.audioAsset?.url
      ? undefined
      : synthesizedUrl
        ? undefined
        : buildGeneratedAudio(
          script.segments.map(seg => {
            const speaker = script.speakers.find(s => s.id === seg.speakerId);
            return {
              speakerId: seg.speakerId,
              speakerName: speaker?.name ?? seg.speakerId,
              role: speaker?.role ?? sourceConfig.listeningMode ?? 'Hörtext',
              text: seg.text,
            };
          }),
          {
            provider: ttsConfig.provider,
            locale: ttsConfig.locale ?? 'de-DE',
            voiceHint: ttsConfig.voiceHint,
            rate: ttsConfig.rate,
            pitch: ttsConfig.pitch,
          }
        ),
  };

  return planned.questions.map((entry, index) => {
    const normalised = normaliseGeneratedOptions(entry.options, entry.correctOptionId);
    return {
      id: `${questionType}-audio-${Date.now()}-${index}`,
      type: questionType,
      sessionType,
      difficulty,
      inputType: QuestionInputType.MULTIPLE_CHOICE,
      prompt: entry.prompt,
      context: transcriptText,
      title: script.title,
      subtitle: script.subtitle,
      theme: planned.theme,
      options: normalised.options,
      correctOptionId: normalised.correctOptionId,
      explanation: entry.explanation,
      points: resolvePointsPerQuestion(index, sourceConfig),
      audioSource,
      sourceMedia: {
        type: 'audio' as const,
        transcript: planned.context,
        audio: audioSource,
      },
      playbackPolicy: playback,
      instructions: sourceConfig.prompts?.instructions,
      renderConfig: {
        ...(sourceConfig.renderOverrides ?? {}),
        showAudioControls: true,
      },
      scoring: sourceConfig.scoringOverrides,
    } as Question;
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
    'Standard multiple choice interactions, including gap text variants.',
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
      const questions = await generateAudioPassageMCQ(
        sessionType,
        difficulty,
        targetCount,
        sourceConfig,
        userId,
        recordUsage
      );
      return { questions };
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

function selectPollyVoiceId(hint?: string): string | undefined {
  if (!hint) return undefined;
  const value = hint.trim().toLowerCase();
  // German voices: Vicki (default, female, neural), Hans (male)
  if (/hans|male|herr|deep|bariton/.test(value)) return 'Hans';
  if (/vicki|female|frau|neutral|standard|de-?de/.test(value)) return 'Vicki';
  return undefined;
}
