import { generateObject } from 'ai';
import { z } from 'zod';
import { QuestionDifficulty } from './question-types';
import type { SessionSourceOptions } from '../session-registry';
import { ModelId } from '@/lib/ai/model-registry';
import { customModel } from '@/lib/ai/models';
import { getNewsTopicFromPool, type NewsTopic } from '@/lib/news/news-topic-pool';
import type { ModelUsageRecord } from '@/lib/questions/modules/types';

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

interface SourceWithGaps {
  theme: string;
  title: string;
  subtitle: string;
  rawContext: string;
  gappedContext: string;
  gaps: Array<{
    gapNumber: number;
    removedWord: string;
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
  const newsTopic = await getNewsTopicFromPool(userId);
  const selectedTheme =
    overrides?.theme ?? newsTopic?.theme ?? THEMES[Math.floor(Math.random() * THEMES.length)];

  const model = customModel(ModelId.CLAUDE_HAIKU_4_5);

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
    const result = await generateObject({
      model,
      schema: RawSourceSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8,
    });
    recordModelUsage(recordUsage, ModelId.CLAUDE_HAIKU_4_5, result.usage);

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
  const model = customModel(ModelId.CLAUDE_HAIKU_4_5);
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

const buildUserPrompt = (attempt: number) => (overrides?.userPrompt ??
`Identify and return EXACTLY ${requiredCount} gaps in this German text. ALL ${requiredCount} GAPS MUST BE RETURNED.

Theme: ${source.theme}
Title: ${source.title}
Subtitle: ${source.subtitle}

Text:
${source.context}


${attempt > 1 ? `HINWEIS: Beim letzten Versuch wurden zu wenige Lücken geliefert. Bitte gib dieses Mal unbedingt alle ${requiredCount} Lücken an.` : ''}

IMPORTANT: Return all ${requiredCount} gaps. Do not stop early. Return the gaps in order of appearance in the text.`)
    .replace('{{requiredCount}}', requiredCount.toString());

  for (let attempt = 1; attempt <= MAX_GAP_ATTEMPTS; attempt += 1) {
    try {
      const result = await generateObject({
        model,
        mode: 'json',
        schema: GapIdentificationSchema,
        schemaName: 'gap_identification',
        schemaDescription: 'Identifies gaps in German text for C1 level exercises',
        system: `${(overrides?.systemPrompt ?? baseSystemPrompt).replace('{{requiredCount}}', requiredCount.toString())}\n\n${exampleBlock}`,
        prompt: buildUserPrompt(attempt),
        temperature: 0.4,
      });
      recordModelUsage(recordUsage, ModelId.CLAUDE_HAIKU_4_5, result.usage);

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
    } catch {
      // retry
    }
  }

  const fallback = generateDeterministicGaps(source, requiredCount);
  if (fallback) {
    return { ...fallback, newsTopic: source.newsTopic ?? null };
  }
  throw new Error(
    `Failed to identify gaps in source after ${MAX_GAP_ATTEMPTS} attempts`
  );
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
