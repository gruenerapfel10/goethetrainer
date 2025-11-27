import { generateObject } from 'ai';
import { z } from 'zod';
import { QuestionDifficulty } from './question-types';
import type { SessionSourceOptions } from '../session-registry';
import { ModelId } from '@/lib/ai/model-registry';
import { customModel } from '@/lib/ai/models';
import { getNewsTopicFromPool, type NewsTopic } from '@/lib/news/news-topic-pool';
import type { ModelUsageRecord } from '@/lib/questions/modules/types';
import { logAiRequest, logAiResponse } from '@/lib/ai/ai-logger';
import {
  ReadingAssessmentCategory,
  getReadingAssessmentCategoryDefinition,
} from '@/lib/questions/assessment-categories';

export const maxDuration = 30;

// Diverse themes to avoid repetition
const THEMES = [
  'WIRTSCHAFT',
  'BILDUNG',
  'TECHNOLOGIE',
  'GESELLSCHAFT',
  'UMWELT',
  'GESUNDHEIT',
  'KULTUR',
  'SPORT',
  'VERKEHR',
  'MEDIEN',
  'TOURISMUS',
  'ARBEIT',
];

// Schema for raw source generation (Pass 1)
const RawSourceSchema = z.object({
  theme: z.string().describe('Theme/category in German (e.g., WIRTSCHAFT, BILDUNG)'),
  title: z.string().describe('Title of the passage in German'),
  subtitle: z.string().describe('Subtitle or brief description in German'),
  context: z.string().describe('German passage 200-300 words appropriate for C1 level'),
});

// Schema for gap identification (Pass 2)
const GapIdentificationSchema = z.object({
  gaps: z.array(
    z.object({
      gapNumber: z.number().describe('Gap number 1-9'),
      position: z.number().describe('Character position in text where gap should be'),
      removedWord: z.string().describe('The word/phrase that was removed (the correct answer)'),
      context: z.string().describe('Context around the gap (20 chars before and after)'),
    })
  ).describe('Exactly 9 gaps identified in the text'),
  gappedText: z.string().describe('The modified text with [GAP_1] [GAP_2] etc placeholders'),
});

const GAP_WORD_REGEX = /\b[\p{L}][\p{L}\-]{3,}\b/gu;
const GAP_PLACEHOLDER_REGEX = /\[(?:GAP|Gap|gap)[\s_\-]?(\d+)\]/g;


function normaliseGapPlaceholders(text: string): string {
  let normalised = text.replace(GAP_PLACEHOLDER_REGEX, (_match, num) => `[GAP_${num}]`);
  normalised = normalised.replace(/\(GAP_(\d+)\)/g, '[GAP_$1]');
  normalised = normalised.replace(/\[\[(GAP_\d+)\]\]/g, '[$1]');
  return normalised;
}

function coerceGapEntries(value: unknown): GapEntryRecord[] | null {
  if (Array.isArray(value)) {
    return value as GapEntryRecord[];
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed as GapEntryRecord[];
      }
    } catch {
      // ignore invalid payload
    }
  }
  return null;
}

function hasAllGapPlaceholders(text: string, requiredCount: number): boolean {
  return Array.from({ length: requiredCount }, (_, index) => `GAP_${index + 1}`)
    .every(marker => text.includes(`[${marker}]`));
}

function buildGapExampleBlock(requiredCount: number): string {
  const gapEntries = Array.from({ length: requiredCount }, (_, index) => {
    const gapNumber = index + 1;
    return `    { "gapNumber": ${gapNumber}, "position": ${gapNumber * 45}, "removedWord": "Beispielwort${gapNumber}", "context": "Kontext um Beispielwort${gapNumber}" }`;
  }).join(',\n');

  const placeholderSentence = Array.from({ length: requiredCount }, (_, index) => `Satz${index + 1} [GAP_${index + 1}]`)
    .join('. ');

  return `Beispiel (${requiredCount} Lücken):\n{\n  "gaps": [\n${gapEntries}\n  ],\n  "gappedText": "${placeholderSentence}."\n}\nNutze exakt das Format [GAP_n] mit Großbuchstaben und Unterstrich. Alle ${requiredCount} Platzhalter müssen im Text stehen.`;
}

function generateDeterministicGaps(
  source: RawSource,
  requiredCount: number
): SourceWithGaps | null {
  const text = source.context;
  const matches = Array.from(text.matchAll(GAP_WORD_REGEX));
  if (matches.length === 0) {
    return null;
  }

  const selections: Array<{ match: RegExpMatchArray; index: number }> = [];
  const step = Math.max(1, Math.floor(matches.length / requiredCount));
  let currentIndex = 0;

  for (let gap = 0; gap < requiredCount; gap += 1) {
    const target = Math.min(matches.length - 1, currentIndex);
    const match = matches[target];
    if (!match || match.index === undefined) {
      break;
    }
    selections.push({ match, index: target });
    currentIndex += step;
  }

  if (selections.length < requiredCount) {
    const additional = matches.filter((_match, idx) => !selections.some(sel => sel.index === idx));
    for (const extra of additional) {
      if (selections.length >= requiredCount) {
        break;
      }
      selections.push({ match: extra, index: matches.indexOf(extra) });
    }
  }

  if (selections.length < requiredCount) {
    return null;
  }

  selections.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));

  let cursor = 0;
  const pieces: string[] = [];
  const gapEntries: SourceWithGaps['gaps'] = [];

  selections.slice(0, requiredCount).forEach((selection, idx) => {
    const { match } = selection;
    const start = match.index ?? 0;
    const value = match[0];
    pieces.push(text.slice(cursor, start));
    pieces.push(`[GAP_${idx + 1}]`);
    cursor = start + value.length;

    gapEntries.push({
      gapNumber: idx + 1,
      removedWord: value,
    });
  });

  pieces.push(text.slice(cursor));
  const gappedContext = pieces.join('');

  return {
    theme: source.theme,
    title: source.title,
    subtitle: source.subtitle,
    rawContext: source.context,
    gappedContext,
    gaps: gapEntries,
  };
}


const REQUIRED_GAP_COUNT = 9;
const MAX_GAP_ATTEMPTS = 2;

type RawSource = z.infer<typeof RawSourceSchema> & { newsTopic?: NewsTopic | null };

export interface SourceWithGaps {
  theme: string;
  title: string;
  subtitle: string;
  rawContext: string;
  gappedContext: string;
  gaps: Array<{
    gapNumber: number;
    removedWord: string;
    sentence?: string;
    assessmentCategory?: ReadingAssessmentCategory;
  }>;
  newsTopic?: NewsTopic | null;
}

interface GapEntryRecord {
  gapNumber: number;
  position: number;
  removedWord: string;
  context: string;
}

/**
 * Pass 1: Generate raw source material with diverse themes
 */
export async function generateRawSource(
  difficulty: QuestionDifficulty = QuestionDifficulty.INTERMEDIATE,
  overrides?: SessionSourceOptions['raw'],
  logMetadata?: { teilLabel?: string },
  userId?: string,
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<RawSource> {
  const newsTopic = await getNewsTopicFromPool();
  const selectedTheme =
    overrides?.theme ?? newsTopic?.theme ?? THEMES[Math.floor(Math.random() * THEMES.length)];
  const model = customModel(ModelId.GPT_5);

  const defaultSystemPrompt = `You are a German language specialist creating Goethe C1 level reading passages.

Generate ONE German text passage (200-300 words) with theme, title, and subtitle.

Requirements:
1. ALL content in German language ONLY
2. Provide a THEME (category): ${selectedTheme}
3. Provide a TITLE for the passage (5-10 words)
4. Provide a SUBTITLE (brief description 10-15 words)
5. One context passage (200-300 words, C1 level, naturally written)

The passage should be rich with vocabulary and complex sentence structures suitable for gap-filling exercises.${
    newsTopic
      ? `

Nutze folgende aktuelle Nachricht als thematischen Ausgangspunkt, aber schreibe einen originellen Text:
- Schlagzeile: ${newsTopic.headline}
- Zusammenfassung: ${newsTopic.summary || 'Keine Zusammenfassung verfügbar.'}${
          newsTopic.source
            ? `
- Quelle: ${newsTopic.source}${newsTopic.publishedAt ? ` • ${newsTopic.publishedAt}` : ''}`
            : ''
        }`
      : ''
  }`;

  const defaultUserPrompt = `Generate a reading passage for theme: ${selectedTheme} at ${difficulty} level.${
    newsTopic ? ` Orientiere dich inhaltlich an der Nachricht "${newsTopic.headline}" ohne sie zu kopieren.` : ''
  }`;

  const systemPrompt = (overrides?.systemPrompt ?? defaultSystemPrompt)
    .replace('{{theme}}', selectedTheme)
    .replace('{{difficulty}}', String(difficulty));

  const userPrompt = (overrides?.userPrompt ?? defaultUserPrompt)
    .replace('{{theme}}', selectedTheme)
    .replace('{{difficulty}}', String(difficulty));

  try {
    logAiRequest('RawSource', 'RawSourceSchema (theme/title/subtitle/context in German)', {
      system: systemPrompt,
      prompt: userPrompt,
      metadata: {
        teil: logMetadata?.teilLabel ?? 'n/a',
        theme: selectedTheme,
        difficulty,
        newsHeadline: newsTopic?.headline,
      },
    });
    const result = await generateObject({
      model,
      schema: RawSourceSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8,
    });
    recordModelUsage(recordUsage, ModelId.GPT_5, result.usage);
    logAiResponse('RawSource', result.object);

    if (newsTopic) {
      const labelSuffix = logMetadata?.teilLabel ? ` (${logMetadata.teilLabel})` : '';
      console.log(`[NewsPool] Using headline${labelSuffix}:`, newsTopic.headline);
    }

    return {
      ...result.object,
      newsTopic: newsTopic ?? null,
    };
  } catch (error) {
    throw new Error(`Failed to generate source material: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Pass 2: Identify 9 gaps in the source text and extract answers
 */
export async function identifyGapsInSource(
  source: RawSource,
  overrides?: SessionSourceOptions['gaps'],
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<SourceWithGaps> {
  const model = customModel(ModelId.GPT_5);
  const requiredCount = overrides?.requiredCount ?? REQUIRED_GAP_COUNT;

const baseSystemPrompt = `You are a German language expert creating gap-fill exercises for C1 level learners.

Your task: Identify EXACTLY ${requiredCount} strategically placed gaps in the provided German text.

Requirements:
1. Select ${requiredCount} words/phrases that are:
   - Important for comprehension
   - Varied in difficulty and position
   - Between 1-3 words each
   - Distributed throughout the entire text (don't cluster them)
   - Include gaps from the beginning, middle, and end of the text
2. For each of the ${requiredCount} gaps:
   - Record the exact word/phrase to remove (the correct answer)
   - Record its character position in the original text
   - Provide context around the gap
3. Return the text with gaps replaced by [GAP_1], [GAP_2], ... [GAP_${requiredCount}] (all must be present)
4. The gaps array MUST have exactly ${requiredCount} elements

Return ALL ${requiredCount} gaps in order of appearance in the text. GAP_1 is the first gap, GAP_${requiredCount} is the last gap.`;
  const exampleBlock = buildGapExampleBlock(requiredCount);

const buildUserPrompt = () => (overrides?.userPrompt ??
`Identify and return EXACTLY ${requiredCount} gaps in this German text. ALL ${requiredCount} GAPS MUST BE RETURNED.

Theme: ${source.theme}
Title: ${source.title}
Subtitle: ${source.subtitle}

Text:
${source.context}


IMPORTANT: Return all ${requiredCount} gaps. Do not stop early. Return the gaps in order of appearance in the text.`)
    .replace('{{requiredCount}}', requiredCount.toString());

  const executeGapExtraction = async () => {
    const prompt = buildUserPrompt();
    const gapSystemPrompt = `${(overrides?.systemPrompt ?? baseSystemPrompt).replace('{{requiredCount}}', requiredCount.toString())}\n\n${exampleBlock}`;
    logAiRequest(
      'GapIdentification',
      `GapIdentificationSchema with exactly ${requiredCount} gaps`,
      {
        system: gapSystemPrompt,
        prompt,
        metadata: {
          requiredCount,
          title: source.title,
        },
      }
    );
    const result = await generateObject({
      model,
      mode: 'json',
      schema: GapIdentificationSchema,
      schemaName: 'gap_identification',
      schemaDescription: 'Identifies gaps in German text for C1 level exercises',
      system: gapSystemPrompt,
      prompt,
      temperature: 0.4,
    });
    recordModelUsage(recordUsage, ModelId.GPT_5, result.usage);
    logAiResponse('GapIdentification', result.object);

    const parsedGaps = coerceGapEntries(result.object.gaps);
    const gappedText = typeof result.object.gappedText === 'string' ? result.object.gappedText : '';
    const normalisedGappedText = normaliseGapPlaceholders(gappedText);

    if (!parsedGaps || parsedGaps.length !== requiredCount) {
      throw new Error(`Expected ${requiredCount} gaps but received ${parsedGaps?.length ?? 0}`);
    }

    if (!hasAllGapPlaceholders(normalisedGappedText, requiredCount)) {
      throw new Error('Gapped text does not contain all required placeholders');
    }

    const sanitizedGappedText = normalisedGappedText.replace(/\[(GAP_\d+)\]\]/g, '[$1]');
    parsedGaps.sort((a, b) => a.gapNumber - b.gapNumber);

    return {
      theme: source.theme,
      title: source.title,
      subtitle: source.subtitle,
      rawContext: source.context,
      gappedContext: sanitizedGappedText,
      gaps: parsedGaps.map(gap => ({
        gapNumber: gap.gapNumber,
        removedWord: gap.removedWord,
      })),
      newsTopic: source.newsTopic ?? null,
    };
  };

  try {
    return await executeGapExtraction();
  } catch (error) {
    console.error(
      `Gap identification failed: ${error instanceof Error ? error.message : String(error)}`
    );
    const fallback = generateDeterministicGaps(source, requiredCount);
    if (fallback) {
      return { ...fallback, newsTopic: source.newsTopic ?? null };
    }
    throw error;
  }
}

/**
 * Complete two-pass source generation
 */
export async function generateSourceWithGaps(
  difficulty: QuestionDifficulty = QuestionDifficulty.INTERMEDIATE,
  options?: SessionSourceOptions,
  metadata?: { teilLabel?: string },
  userId?: string,
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<SourceWithGaps> {
  // Pass 1: Generate raw source
  const rawSource = await generateRawSource(difficulty, options?.raw, metadata, userId, recordUsage);

  // Pass 2: Identify gaps
  const sourceWithGaps = await identifyGapsInSource(rawSource, options?.gaps, recordUsage);

  return sourceWithGaps;
}

export async function generatePlannedGapPassage(
  params: {
    categories: ReadingAssessmentCategory[];
    theme?: string;
    teilLabel?: string;
    optionStyle?: 'word' | 'statement';
    difficulty?: QuestionDifficulty;
    userId?: string;
  },
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<SourceWithGaps> {
  const { categories, theme, teilLabel, optionStyle, difficulty, userId } = params;
  if (!categories.length) {
    throw new Error('Planned gap generation requires at least one category');
  }

  const newsTopic = await getNewsTopicFromPool();
  const resolvedTheme =
    theme ?? newsTopic?.theme ?? THEMES[Math.floor(Math.random() * THEMES.length)];
  const model = customModel(ModelId.GPT_5);
  const schema = z.object({
    theme: z.string().min(3),
    title: z.string().min(5),
    subtitle: z.string().min(10),
    fullText: z.string().min(200),
    gappedText: z.string().min(200),
    gaps: z
      .array(
        z.object({
          gapNumber: z.number().int().positive(),
          removedWord: z.string().min(1),
          sentence: z.string().min(20),
        })
      )
      .length(categories.length),
  });

  const planLines = categories
    .map((category, index) => {
      const definition = getReadingAssessmentCategoryDefinition(category);
      const label = definition?.label ?? category;
      const description = definition?.description ?? '';
      const hint = definition?.generationHint ?? '';
      const extra =
        category === ReadingAssessmentCategory.COLLOCATION_CONTROL
          ? 'WICHTIG (Kollokation): Entferne immer die komplette feste Verbindung (z. B. Verb + Objekt oder ganze Redewendung), nicht nur Teile davon.'
          : '';
      return `Gap ${index + 1}: ${label}
- Kompetenz: ${description}
- Generationshinweis: ${hint}
${extra ? `- Zusatz: ${extra}` : ''}`;
    })
    .join('\n\n');

  const jsonExample = JSON.stringify(
    {
      theme: resolvedTheme,
      title: 'Titel mit 5-10 Wörtern',
      subtitle: 'Kurzer Untertitel (10-15 Wörter)',
      fullText: 'Originaltext ohne Platzhalter …',
      gappedText: 'Text mit [GAP_1] … [GAP_n] …',
      gaps: categories.map((_, index) => ({
        gapNumber: index + 1,
        removedWord: `Beispielwort${index + 1}`,
        sentence: `Satz ${index + 1} mit Originalwort.`,
      })),
    },
    null,
    2
  );

  const prompt = `
Du schreibst einen zusammenhängenden Goethe C1 Lesetext (ca. 220-260 Wörter) mit exakt ${
    categories.length
  } geplanten Lücken. Jeder Gap testet die angegebene Kompetenz.

Vorgaben:
- Thema: ${resolvedTheme}.
- Schwierigkeitsgrad: ${difficulty ?? QuestionDifficulty.INTERMEDIATE}.
- ${
    newsTopic
      ? `Nutze folgende aktuelle Nachricht als thematischen Bezug ohne sie zu kopieren:
  • Schlagzeile: ${newsTopic.headline}
  • Zusammenfassung: ${newsTopic.summary || 'Keine Zusammenfassung verfügbar'}
  • Quelle: ${newsTopic.source ?? 'unbekannt'}${
          newsTopic.publishedAt ? ` (${newsTopic.publishedAt})` : ''
        }`
      : 'Wähle ein kohärentes gesellschaftlich relevantes Unterthema.'
  }
- Stil: formell-journalistisch, kohäsiv, natürlich.
- Markiere die Lücken mit [GAP_1] … [GAP_${categories.length}] in "gappedText".
- Liefere zusätzlich "fullText" (ohne Lücken) und für jede Lücke den vollständigen Originalsatz.
- Optionstil: ${
    optionStyle === 'statement'
      ? 'Die Lücke ersetzt einen ganzen Satz.'
      : 'Die Lücke ersetzt ein einzelnes Wort oder eine feste Kurzphrase.'
  }

Gap-Plan:
${planLines}

Ausgabeformat (JSON):
${jsonExample}
`;

  logAiRequest('PlannedGaps', 'Planned gapped passage', {
    prompt,
    metadata: {
      gapCount: categories.length,
      teil: teilLabel ?? 'n/a',
      newsHeadline: newsTopic?.headline,
    },
  });

  const result = await generateObject({
    model,
    schema,
    system:
      'Du bist Prüfungsautor:in für Goethe C1. Erstelle Texte mit sorgfältig geplanten Lücken.',
    prompt,
    temperature: 0.4,
  });
  recordModelUsage(recordUsage, ModelId.GPT_5, result.usage);
  logAiResponse('PlannedGaps', result.object);

  const rawFullText = result.object.fullText.trim();
  const normalisedGappedText = normaliseGapPlaceholders(result.object.gappedText.trim());
  if (!hasAllGapPlaceholders(normalisedGappedText, categories.length)) {
    throw new Error('Planned gapped text does not include all required placeholders');
  }

  const categoryByGap = new Map<number, ReadingAssessmentCategory>();
  categories.forEach((category, index) => categoryByGap.set(index + 1, category));

  const sortedGaps = [...result.object.gaps].sort((a, b) => a.gapNumber - b.gapNumber);

  return {
    theme: result.object.theme,
    title: result.object.title,
    subtitle: result.object.subtitle,
    rawContext: rawFullText,
    gappedContext: normalisedGappedText,
    gaps: sortedGaps.map(entry => ({
      gapNumber: entry.gapNumber,
      removedWord: entry.removedWord,
      sentence: entry.sentence,
      assessmentCategory: categoryByGap.get(entry.gapNumber),
    })),
    newsTopic: newsTopic ?? null,
  };
}

export async function generatePlannedSentenceInsertionSet(
  params: {
    sentencePoolSize: number;
    gapCount: number;
    theme?: string;
    teilLabel?: string;
    difficulty?: QuestionDifficulty;
    userId?: string;
  },
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<SentenceInsertionPlan> {
  const { sentencePoolSize, gapCount, theme, teilLabel, difficulty, userId } = params;
  if (gapCount <= 0 || sentencePoolSize < gapCount) {
    throw new Error('Sentence pool must be >= gap count');
  }
  const newsTopic = await getNewsTopicFromPool();
  const resolvedTheme =
    theme ?? newsTopic?.theme ?? THEMES[Math.floor(Math.random() * THEMES.length)];
  const model = customModel(ModelId.GPT_5);
  const schema = z.object({
    theme: z.string().min(3),
    title: z.string().min(5),
    subtitle: z.string().min(10),
    intro: z.string().optional(),
    context: z.string().min(260),
    gaps: z
      .array(
        z.object({
          gapNumber: z.number().int().positive(),
          placeholder: z.string().min(3),
          solution: z.string().min(1),
        })
      )
      .length(gapCount),
    sentences: z
      .array(
        z.object({
          id: z.string().min(1),
          text: z.string().min(10),
          matchesGap: z.boolean(),
        })
      )
      .length(sentencePoolSize),
  });

  const jsonExample = JSON.stringify(
    {
      theme: resolvedTheme,
      title: 'Titel',
      subtitle: 'Untertitel',
      intro: 'Kurze Einführung …',
      context: 'Kommentartext mit [GAP_1] …',
      gaps: Array.from({ length: gapCount }).map((_, idx) => ({
        gapNumber: idx + 1,
        placeholder: `[GAP_${idx + 1}]`,
        solution: `S${idx + 1}`,
      })),
      sentences: Array.from({ length: sentencePoolSize }).map((_, idx) => ({
        id: `S${idx + 1}`,
        text: `Satz ${idx + 1} …`,
        matchesGap: idx < gapCount,
      })),
    },
    null,
    2
  );

  const prompt = `
Du verfasst einen argumentativen Kommentar (ca. 320 Wörter) mit ${gapCount} Lücken [GAP_1 .. GAP_${gapCount}].

Vorgaben:
- Thema: ${resolvedTheme}
- Schwierigkeitsgrad: ${difficulty ?? QuestionDifficulty.INTERMEDIATE}
- ${
    newsTopic
      ? `Nutze folgende Nachricht als Ausgangspunkt ohne sie zu kopieren:
  • Schlagzeile: ${newsTopic.headline}
  • Zusammenfassung: ${newsTopic.summary || 'Keine Zusammenfassung verfügbar'}
  • Quelle: ${newsTopic.source ?? 'unbekannt'}${
            newsTopic.publishedAt ? ` (${newsTopic.publishedAt})` : ''
          }`
      : 'Wähle ein gesellschaftliches Unterthema.'
  }
- Streue die Lücken gleichmäßig; jeder Gap ersetzt einen vollständigen Satz oder Teilsatz (1-2 Hauptsätze).
- Liefere zusätzlich ${sentencePoolSize} Kandidatensätze: ${gapCount} passende + ${
      sentencePoolSize - gapCount
    } falsche. Markiere per „matchesGap”.

Ausgabeformat (JSON):
${jsonExample}
`;

  logAiRequest('PlannedSentencePool', 'Sentence insertion set', {
    prompt,
    metadata: {
      gapCount,
      sentencePoolSize,
      teil: teilLabel ?? 'Teil',
      newsHeadline: newsTopic?.headline,
    },
  });

  const result = await generateObject({
    model,
    schema,
    system:
      'Du bist Prüfungsautor:in für Goethe C1. Erstelle Kommentare mit Lücken und Satzpool.',
    prompt,
    temperature: 0.35,
  });
  recordModelUsage(recordUsage, ModelId.GPT_5, result.usage);
  logAiResponse('PlannedSentencePool', result.object);

  return {
    ...result.object,
    intro: result.object.intro,
    newsTopic: newsTopic ?? null,
  };
}

export interface SentenceInsertionPlan {
  theme: string;
  title: string;
  subtitle: string;
  intro?: string;
  context: string;
  sentences: Array<{
    id: string;
    text: string;
    matchesGap: boolean;
  }>;
  gaps: Array<{
    gapNumber: number;
    placeholder: string;
    solution: string;
  }>;
  newsTopic?: NewsTopic | null;
}

export interface PlannedArticleQuestionSet {
  theme: string;
  title: string;
  subtitle: string;
  context: string;
  questions: Array<{
    prompt: string;
    options: Array<{ id: string; text: string }>;
    correctOptionId: string;
    explanation?: string;
  }>;
  newsTopic?: NewsTopic | null;
}

export async function generatePlannedArticleQuestionSet(
  params: {
    questionCount: number;
    optionsPerQuestion: number;
    theme?: string;
    teilLabel?: string;
    difficulty?: QuestionDifficulty;
    userId?: string;
  },
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<PlannedArticleQuestionSet> {
  const { questionCount, optionsPerQuestion, theme, teilLabel, difficulty, userId } = params;
  if (questionCount <= 0) {
    throw new Error('Question count must be positive for planned article set');
  }
  const newsTopic = await getNewsTopicFromPool();
  const resolvedTheme =
    theme ?? newsTopic?.theme ?? THEMES[Math.floor(Math.random() * THEMES.length)];
  const model = customModel(ModelId.GPT_5);
  const schema = z.object({
    theme: z.string().min(3),
    title: z.string().min(5),
    subtitle: z.string().min(10),
    context: z.string().min(220),
    questions: z
      .array(
        z.object({
          prompt: z.string().min(10),
          options: z
            .array(
              z.object({
                id: z.string().min(1),
                text: z.string().min(1),
              })
            )
            .length(optionsPerQuestion),
          correctOptionId: z.string().min(1),
          explanation: z.string().optional(),
        })
      )
      .length(questionCount),
  });

  const jsonExample = JSON.stringify(
    {
      theme: resolvedTheme,
      title: 'Titel mit 5-10 Wörtern',
      subtitle: 'Kurzbeschreibung (10-15 Wörter)',
      context: 'Artikeltext mit 220-260 Wörtern …',
      questions: Array.from({ length: questionCount }).map((_, idx) => ({
        prompt: `Frage ${idx + 1} als Satzfragment …`,
        options: Array.from({ length: optionsPerQuestion }).map((__, optIdx) => ({
          id: String.fromCharCode(97 + optIdx),
          text: `Option ${optIdx + 1}`,
        })),
        correctOptionId: 'a',
        explanation: 'Kurze Begründung.',
      })),
    },
    null,
    2
  );

  const prompt = `
Du verfasst einen lesernahen Artikel (ca. 280-320 Wörter) mit genau ${questionCount} Verständnisfragen (Multiple Choice, ${optionsPerQuestion} Optionen).

Vorgaben:
- Thema: ${resolvedTheme}
- Schwierigkeitsgrad: ${difficulty ?? QuestionDifficulty.INTERMEDIATE}
- ${
    newsTopic
      ? `Nutze folgende Nachricht als Ausgangspunkt ohne sie zu kopieren:
  • Schlagzeile: ${newsTopic.headline}
  • Zusammenfassung: ${newsTopic.summary || 'Keine Zusammenfassung verfügbar'}
  • Quelle: ${newsTopic.source ?? 'unbekannt'}${
          newsTopic.publishedAt ? ` (${newsTopic.publishedAt})` : ''
        }`
      : 'Wähle ein aktuelles gesellschaftliches Unterthema.'
  }
- Artikelstil: populärwissenschaftlich / gehobene Presse.
- Jede Frage:
  • Prompt als Satzfragment, endet mit „…“ (keine W-Frage).
  • Optionen homogen (gleiche Wortart/Register), max. 12 Wörter.
  • Genau eine richtige Option, Begründung anhand konkreter Textstelle.
- Fragen decken unterschiedliche Aspekte (Hauptaussage, Detail, Schlussfolgerung, Haltung).

Liefere ausschließlich JSON in folgendem Format:
${jsonExample}
`;

  logAiRequest('PlannedArticleMC', 'Article MC set JSON', {
    prompt,
    metadata: {
      teil: teilLabel ?? 'Teil',
      questionCount,
      theme: resolvedTheme,
      newsHeadline: newsTopic?.headline,
    },
  });

  const result = await generateObject({
    model,
    schema,
    system:
      'Du bist Prüfungsautor:in für Goethe C1. Erstelle Artikel mit präzisen Multiple-Choice-Fragen.',
    prompt,
    temperature: 0.35,
  });
  recordModelUsage(recordUsage, ModelId.GPT_5, result.usage);
  logAiResponse('PlannedArticleMC', result.object);

  return {
    ...result.object,
    newsTopic: newsTopic ?? null,
  };
}

export interface PlannedAuthorStatementSet {
  theme: string;
  title: string;
  subtitle: string;
  intro: string;
  authors: Array<{
    id: string;
    name: string;
    role: string;
    summary: string;
    excerpt: string;
  }>;
  statements: Array<{
    id: string;
    text: string;
    authorId: string;
  }>;
  example: {
    text: string;
    authorId: string;
    explanation?: string;
  };
  newsTopic?: NewsTopic | null;
}

export async function generatePlannedAuthorStatementSet(
  params: {
    authorCount: number;
    statementCount: number;
    unmatchedCount: number;
    theme?: string;
    teilLabel?: string;
    difficulty?: QuestionDifficulty;
    userId?: string;
  },
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<PlannedAuthorStatementSet> {
  const { authorCount, statementCount, unmatchedCount, theme, teilLabel, difficulty, userId } = params;
  const newsTopic = await getNewsTopicFromPool();
  const resolvedTheme =
    theme ?? newsTopic?.theme ?? THEMES[Math.floor(Math.random() * THEMES.length)];
  const model = customModel(ModelId.GPT_5);
  const schema = z.object({
    theme: z.string(),
    title: z.string(),
    subtitle: z.string(),
    intro: z.string(),
    authors: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          role: z.string(),
          summary: z.string(),
          excerpt: z.string(),
        })
      )
      .length(authorCount),
    statements: z
      .array(
        z.object({
          id: z.string(),
          text: z.string(),
          authorId: z.string(),
        })
      )
      .length(statementCount),
    example: z.object({
      text: z.string(),
      authorId: z.string(),
      explanation: z.string().optional(),
    }),
  });

  const jsonExample = JSON.stringify(
    {
      theme: resolvedTheme,
      title: 'Titel',
      subtitle: 'Untertitel',
      intro: 'Einführung …',
      authors: Array.from({ length: authorCount }).map((_, idx) => ({
        id: `author_${idx + 1}`,
        name: `Dr. Name ${idx + 1}`,
        role: 'Professorin für …',
        summary: 'Abstract …',
        excerpt: 'Zitat …',
      })),
      statements: Array.from({ length: statementCount }).map((_, idx) => ({
        id: `S${idx + 1}`,
        text: `Aussage ${idx + 1}`,
        authorId: idx < statementCount - unmatchedCount ? 'author_1' : '0',
      })),
      example: {
        text: 'Beispielaussage',
        authorId: 'author_1',
        explanation: 'Begründung',
      },
    },
    null,
    2
  );

  const prompt = `
Du erstellst für Goethe C1 Lesen Teil 4 eine Expertenrubrik mit ${authorCount} Beiträgen und ${statementCount} Aussagen (${unmatchedCount} ohne Zuordnung).

Vorgaben:
- Thema: ${resolvedTheme}
- Schwierigkeitsgrad: ${difficulty ?? QuestionDifficulty.INTERMEDIATE}
- ${
    newsTopic
      ? `Nutze folgende Nachricht als thematische Referenz:
  • Schlagzeile: ${newsTopic.headline}
  • Zusammenfassung: ${newsTopic.summary || 'Keine Zusammenfassung verfügbar'}
  • Quelle: ${newsTopic.source ?? 'unbekannt'}${
            newsTopic.publishedAt ? ` (${newsTopic.publishedAt})` : ''
          }`
      : 'Wähle ein aktuelles gesellschaftliches Thema.'
  }
- Jeder Autor liefert einen Absatz (summary+Zitat).
- Aussagen müssen eindeutig einer Autorin/einem Autor oder "0" (passt nicht) zuordenbar sein.
- Liefere Beispiel (mit Lösung) und Intro.

Ausgabeformat (JSON):
${jsonExample}
`;

  logAiRequest('PlannedAuthorMatch', 'Author statement set', {
    prompt,
    metadata: {
      authorCount,
      statementCount,
      teil: teilLabel ?? 'Teil',
      newsHeadline: newsTopic?.headline,
    },
  });

  const result = await generateObject({
    model,
    schema,
    system:
      'Du bist Prüfungsautor:in für Goethe C1. Erstelle Expertenbeiträge mit zuordenbaren Aussagen.',
    prompt,
    temperature: 0.3,
  });
  recordModelUsage(recordUsage, ModelId.GPT_5, result.usage);
  logAiResponse('PlannedAuthorMatch', result.object);

  return {
    ...result.object,
    newsTopic: newsTopic ?? null,
  };
}
function recordModelUsage(
  recordUsage: ((record: ModelUsageRecord) => void) | undefined,
  modelId: string,
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    outputTokens?: number;
    inputTokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
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
