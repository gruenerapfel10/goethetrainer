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
import { getLevelProfile } from '@/lib/levels/level-profiles';
import { mapLevelToQuestionDifficulty } from '@/lib/levels/utils';

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

const SAFE_THEMES_BY_LEVEL: Record<string, string[]> = {
  A1: ['FAMILIE', 'SCHULE', 'EINKAUFEN', 'WETTER', 'SPORT', 'ARBEIT', 'GESUNDHEIT', 'STADT', 'REISE'],
  A2: ['FAMILIE', 'SCHULE', 'ARBEIT', 'GESUNDHEIT', 'SPORT', 'STADT', 'REISE', 'ALLTAG', 'BILDUNG'],
  B1: ['ARBEIT', 'GESUNDHEIT', 'SCHULE', 'STADT', 'REISE', 'TECHNOLOGIE', 'BILDUNG', 'FAMILIE', 'SPORT'],
};

function levelDifficultyLabel(levelId?: string | null, difficulty?: QuestionDifficulty): string {
  if (levelId && typeof levelId === 'string') {
    return levelId;
  }
  return difficulty ?? QuestionDifficulty.INTERMEDIATE;
}

function buildLevelGuidance(levelId?: string | null): string {
  switch (levelId) {
    case 'A1':
      return 'Nutze nur sehr einfache Hauptsätze (max. 10-12 Wörter), Alltagswortschatz, keine Nebensätze, keine Partizipialkonstruktionen.';
    case 'A2':
      return 'Einfache Hauptsätze (10-15 Wörter), begrenzter Alltagswortschatz, wenige Nebensätze mit weil/aber/denn, klare Kohäsion.';
    case 'B1':
      return 'Mittelange Sätze (12-18 Wörter), geläufige Verben und Nomen, einfache Konnektoren (weil, obwohl, damit), klare Abfolge.';
    case 'B2':
      return 'Variierende Satzlängen (15-22 Wörter), breiter Alltags- und mittlerer Fachwortschatz, aber immer klar und magazinartig, wenige Nebensätze, kein Behörden-/Juristendeutsch.';
    case 'C1':
      return 'Längere Satzgefüge (18-28 Wörter), gehobener Wortschatz, variierende Register, verdeckte Konnexionen sind erlaubt.';
    case 'C2':
      return 'Sehr variierende Satzlängen, voller Wortschatz inklusive Idiomatik, verdichtete Syntax mit vielen Bezügen.';
    default:
      return 'Passe Syntax und Wortschatz an das genannte Niveau an; bevorzuge Klarheit und Kohärenz.';
  }
}

function buildLexicalGuidance(levelId?: string | null): string {
  const profile = getLevelProfile((levelId as any) ?? null);
  if (!profile?.lexicon) return '';
  const avoid = profile.lexicon.avoid?.join(', ');
  const prefer = profile.lexicon.prefer?.join(', ');
  const lines: string[] = [];
  if (prefer) {
    lines.push(`Bevorzuge einfache Alltagswörter (z.B. ${prefer}). Nutze eigene ähnliche Wörter, nicht nur diese Beispiele.`);
  }
  if (avoid) {
    lines.push(`Meide diese Wörter und Register komplett (keine Synonyme nötig): ${avoid}.`);
  }
  return lines.join(' ');
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function trimToWordLimit(text: string, maxWords: number): string {
  if (!text) return text;
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  const trimmed = words.slice(0, maxWords).join(' ');
  return trimmed.trim().replace(/\s+([.,!?;:])/g, '$1');
}

function resolveTheme(levelId: string | null | undefined, override?: string, newsTheme?: string): string {
  if (override) return override;
  const safeList = levelId ? SAFE_THEMES_BY_LEVEL[levelId] : null;
  if (safeList && safeList.length) {
    return safeList[Math.floor(Math.random() * safeList.length)];
  }
  if (newsTheme) return newsTheme;
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}

// Schema for raw source generation (Pass 1)
const RawSourceSchema = z.object({
  theme: z.string().describe('Theme/category in German (e.g., WIRTSCHAFT, BILDUNG)'),
  title: z.string().describe('Title of the passage in German'),
  subtitle: z.string().describe('Subtitle or brief description in German'),
  context: z.string().describe('German passage with controlled length and level'),
  levelId: z.string().optional(),
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

type RawSource = z.infer<typeof RawSourceSchema> & {
  newsTopic?: NewsTopic | null;
  levelId?: string | null;
};

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
  logMetadata?: { teilLabel?: string; levelId?: string | null },
  userId?: string,
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<RawSource> {
  const levelProfile = getLevelProfile((logMetadata?.levelId as any) ?? null);
  const newsTopic =
    logMetadata?.levelId && ['A1', 'A2', 'B1'].includes(logMetadata.levelId)
      ? null
      : await getNewsTopicFromPool();
  const selectedTheme = resolveTheme(logMetadata?.levelId ?? null, overrides?.theme, newsTopic?.theme);
  const targetRange =
    overrides?.targetWordCountRange ?? levelProfile?.passageLength ?? undefined;
  const model = customModel(ModelId.GPT_5);
  const difficultyLabel = levelDifficultyLabel(logMetadata?.levelId ?? null, difficulty);
  const levelGuidance = buildLevelGuidance(logMetadata?.levelId ?? null);
  const lexicalGuidance = buildLexicalGuidance(logMetadata?.levelId ?? null);
  const explicitWordCount =
    targetRange && logMetadata?.levelId && ['A1', 'A2'].includes(logMetadata.levelId)
      ? `WORD COUNT: ${targetRange[0]}-${targetRange[1]} Wörter (hartes Maximum: ${targetRange[1]}).`
      : targetRange
        ? `Target length: ${targetRange[0]}-${targetRange[1]} words.`
        : '';

  const targetHint = explicitWordCount;
  const levelHint =
    logMetadata?.levelId === 'A1'
      ? 'Use VERY simple sentences (max ~12 words), only everyday high-frequency words, no subordinate clauses or participles.'
      : logMetadata?.levelId === 'A2'
        ? 'Use simple sentences (max ~15 words), high-frequency words, minimal subordination.'
        : 'Use level-appropriate syntax and vocabulary.';

  const defaultSystemPrompt = `You are a German language specialist creating exam-style reading passages.

Generate ONE German text passage with theme, title, and subtitle.

Requirements:
1. ALL content in German language ONLY
2. THEME (category): ${selectedTheme}
3. TITLE: 5-10 words
4. SUBTITLE: 10-15 words
5. CONTEXT: naturally written passage
${targetHint}
Level: ${difficultyLabel}
${levelGuidance}
${lexicalGuidance}

${levelHint}
${
    newsTopic
      ? `
Use this news item only as a loose thematic seed (do NOT copy):
- Headline: ${newsTopic.headline}
- Summary: ${newsTopic.summary || 'Keine Zusammenfassung verfügbar.'}${
          newsTopic.source
            ? `
- Source: ${newsTopic.source}${newsTopic.publishedAt ? ` • ${newsTopic.publishedAt}` : ''}`
            : ''
        }`
      : ''
  }`;

  const defaultUserPrompt = `Generate a level-appropriate German reading passage for theme: ${selectedTheme}.${
    newsTopic ? ` Use the news "${newsTopic.headline}" only as inspiration; do not copy.` : ''
  }`;

  const systemPrompt = (overrides?.systemPrompt ?? defaultSystemPrompt).replace('{{theme}}', selectedTheme);

  const userPrompt = (overrides?.userPrompt ?? defaultUserPrompt).replace('{{theme}}', selectedTheme);

  try {
    logAiRequest('RawSource', 'RawSourceSchema (theme/title/subtitle/context in German)', {
      system: systemPrompt,
      prompt: userPrompt,
      metadata: {
        teil: logMetadata?.teilLabel ?? 'n/a',
        theme: selectedTheme,
        difficulty,
        levelId: logMetadata?.levelId ?? 'unspecified',
        newsHeadline: newsTopic?.headline,
      },
    });
    const runGeneration = async (overridePrompt?: string, overrideSystem?: string) =>
      generateObject({
        model,
        schema: RawSourceSchema,
        system: overrideSystem ?? systemPrompt,
        prompt: overridePrompt ?? userPrompt,
        temperature: 0.8,
      });

    let result = await runGeneration();

    if (logMetadata?.levelId && ['A1', 'A2'].includes(logMetadata.levelId) && targetRange) {
      const words = countWords(result.object.context);
      if (words > targetRange[1]) {
        result = {
          ...result,
          object: {
            ...result.object,
            context: trimToWordLimit(result.object.context, targetRange[1]),
          },
        };
      } else if (words < targetRange[0]) {
        const stricterPrompt = `${userPrompt}

CRITICAL: Schreibe zwischen ${targetRange[0]} und ${targetRange[1]} Wörtern (niemals mehr als ${targetRange[1]}). Kurze Hauptsätze, Alltagswortschatz.`;
        const stricterSystem = `${systemPrompt}

WORD COUNT: ${targetRange[0]}-${targetRange[1]} (harte Obergrenze ${targetRange[1]}).`;
        result = await runGeneration(stricterPrompt, stricterSystem);
        const strictWords = countWords(result.object.context);
        if (strictWords > targetRange[1]) {
          result = {
            ...result,
            object: {
              ...result.object,
              context: trimToWordLimit(result.object.context, targetRange[1]),
            },
          };
        }
      }
    }
    recordModelUsage(recordUsage, ModelId.GPT_5, result.usage);
    logAiResponse('RawSource', result.object);

    if (newsTopic) {
      const labelSuffix = logMetadata?.teilLabel ? ` (${logMetadata.teilLabel})` : '';
      console.log(`[NewsPool] Using headline${labelSuffix}:`, newsTopic.headline);
    }

    return {
      ...result.object,
      newsTopic: newsTopic ?? null,
      levelId: logMetadata?.levelId ?? undefined,
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
  const difficultyLabel = levelDifficultyLabel(source.levelId, undefined);
  const levelGuidance = buildLevelGuidance(source.levelId);

const baseSystemPrompt = `You are a German language expert creating level-appropriate gap-fill exercises (Level: ${difficultyLabel}).

Your task: Identify EXACTLY ${requiredCount} strategically placed gaps in the provided German text while respecting the level guidance.

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

Level guidance: ${levelGuidance}

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
      schemaDescription: 'Identifies gaps in German text for level-appropriate exercises',
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
  metadata?: { teilLabel?: string; levelId?: string | null },
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
    targetWordCountRange?: [number, number];
    levelId?: string | null;
  },
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<SourceWithGaps> {
  const {
    categories,
    theme,
    teilLabel,
    optionStyle,
    difficulty,
    userId,
    targetWordCountRange,
    levelId,
  } = params;
  if (!categories.length) {
    throw new Error('Planned gap generation requires at least one category');
  }

  const newsTopic =
    levelId && ['A1', 'A2', 'B1'].includes(levelId) ? null : await getNewsTopicFromPool();
  const resolvedTheme = resolveTheme(levelId, theme, newsTopic?.theme);
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
      return `Gap ${index + 1}: ${label}
- Kompetenz: ${description}
- Generationshinweis: ${hint}
`;
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
Du schreibst einen zusammenhängenden Lesetext mit exakt ${categories.length} geplanten Lücken. Jeder Gap testet die angegebene Kompetenz.

Vorgaben:
- Thema: ${resolvedTheme}.
- Schwierigkeitsgrad/Level: ${levelDifficultyLabel(levelId, difficulty)}.
- Niveau-Hinweis: ${buildLevelGuidance(levelId)}
${targetWordCountRange ? `- WORD COUNT: ${targetWordCountRange[0]}-${targetWordCountRange[1]} Wörter (nicht überschreiten).` : ''}
- Lexik: ${buildLexicalGuidance(levelId) || 'Alltagsnah, klar, vermeide Fachsprache.'}
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
      'Du bist Prüfungsautor:in für Deutsch als Fremdsprache. Schreibe Texte mit sorgfältig geplanten Lücken, angepasst an das genannte Niveau.',
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
    levelId?: string | null;
    targetWordCountRange?: [number, number];
  },
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<SentenceInsertionPlan> {
  const {
    sentencePoolSize,
    gapCount,
    theme,
    teilLabel,
    difficulty,
    userId,
    levelId,
    targetWordCountRange,
  } = params;
  if (gapCount <= 0 || sentencePoolSize < gapCount) {
    throw new Error('Sentence pool must be >= gap count');
  }
  const newsTopic =
    levelId && ['A1', 'A2', 'B1'].includes(levelId) ? null : await getNewsTopicFromPool();
  const resolvedTheme = resolveTheme(levelId, theme, newsTopic?.theme);
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
- Schwierigkeitsgrad/Level: ${levelDifficultyLabel(levelId, difficulty)}
- Niveau-Hinweis: ${buildLevelGuidance(levelId)}
- ${
    targetWordCountRange
      ? `WORD COUNT: ${targetWordCountRange[0]}-${targetWordCountRange[1]} Wörter (nicht überschreiten).`
      : 'WORD COUNT: levelgerecht und kompakt.'
  }
- Lexik: ${buildLexicalGuidance(levelId) || 'Alltagsnahe Wörter, vermeide Fachsprache.'}
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
      'Du bist Prüfungsautor:in für Deutsch als Fremdsprache. Erstelle Kommentare mit Lücken und Satzpool, angepasst an das Niveau.',
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
    levelId?: string | null;
    targetWordCountRange?: [number, number];
  },
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<PlannedArticleQuestionSet> {
  const {
    questionCount,
    optionsPerQuestion,
    theme,
    teilLabel,
    difficulty,
    userId,
    levelId,
    targetWordCountRange,
  } = params;
  if (questionCount <= 0) {
    throw new Error('Question count must be positive for planned article set');
  }
  const newsTopic =
    levelId && ['A1', 'A2', 'B1'].includes(levelId) ? null : await getNewsTopicFromPool();
  const resolvedTheme = resolveTheme(levelId, theme, newsTopic?.theme);
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
- Schwierigkeitsgrad/Level: ${levelDifficultyLabel(levelId, difficulty)}
- Niveau-Hinweis: ${buildLevelGuidance(levelId)}
- ${
    targetWordCountRange
      ? `WORD COUNT: ${targetWordCountRange[0]}-${targetWordCountRange[1]} Wörter (nicht überschreiten).`
      : 'WORD COUNT: levelgerecht und kompakt.'
  }
- Lexik: ${buildLexicalGuidance(levelId) || 'Alltagsnahe Wörter, vermeide Fachsprache.'}
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
      'Du bist Prüfungsautor:in für Deutsch als Fremdsprache. Erstelle Artikel mit präzisen Multiple-Choice-Fragen auf dem angegebenen Niveau.',
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
    levelId?: string | null;
  },
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<PlannedAuthorStatementSet> {
  const {
    authorCount,
    statementCount,
    unmatchedCount,
    theme,
    teilLabel,
    difficulty,
    userId,
    levelId,
  } = params;
  const newsTopic =
    levelId && ['A1', 'A2', 'B1'].includes(levelId) ? null : await getNewsTopicFromPool();
  const resolvedTheme = resolveTheme(levelId, theme, newsTopic?.theme);
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
Du erstellst eine Expertenrubrik (Lesen) mit ${authorCount} Beiträgen und ${statementCount} Aussagen (${unmatchedCount} ohne Zuordnung).

Vorgaben:
- Thema: ${resolvedTheme}
- Schwierigkeitsgrad/Level: ${levelDifficultyLabel(levelId, difficulty)}
- Niveau-Hinweis: ${buildLevelGuidance(levelId)}
- Lexik: ${buildLexicalGuidance(levelId) || 'Alltagsnahe Wörter, vermeide Fachsprache.'}
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
      'Du bist Prüfungsautor:in für Deutsch als Fremdsprache. Erstelle Expertenbeiträge mit zuordenbaren Aussagen, passend zum Niveau.',
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
