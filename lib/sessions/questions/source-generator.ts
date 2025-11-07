import { generateObject } from 'ai';
import { z } from 'zod';
import { QuestionDifficulty } from './question-types';
import type { SessionSourceOptions } from '../session-registry';
import { ModelId } from '@/lib/ai/model-registry';
import { customModel } from '@/lib/ai/models';

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

const REQUIRED_GAP_COUNT = 9;
const MAX_GAP_ATTEMPTS = 4;

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
}

/**
 * Pass 1: Generate raw source material with diverse themes
 */
export async function generateRawSource(
  difficulty: QuestionDifficulty = QuestionDifficulty.INTERMEDIATE,
  overrides?: SessionSourceOptions['raw']
): Promise<z.infer<typeof RawSourceSchema>> {
  const selectedTheme = overrides?.theme ?? THEMES[Math.floor(Math.random() * THEMES.length)];

  const model = customModel(ModelId.CLAUDE_HAIKU_4_5);

  const defaultSystemPrompt = `You are a German language specialist creating Goethe C1 level reading passages.

Generate ONE German text passage (200-300 words) with theme, title, and subtitle.

Requirements:
1. ALL content in German language ONLY
2. Provide a THEME (category): ${selectedTheme}
3. Provide a TITLE for the passage (5-10 words)
4. Provide a SUBTITLE (brief description 10-15 words)
5. One context passage (200-300 words, C1 level, naturally written)

The passage should be rich with vocabulary and complex sentence structures suitable for gap-filling exercises.`;

  const defaultUserPrompt = `Generate a reading passage for theme: ${selectedTheme} at ${difficulty} level.`;

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

    console.log('\n**** PASS 1: SOURCE GENERATION ****');
    console.log(`Theme: ${result.object.theme}`);
    console.log(`Title: ${result.object.title}`);
    console.log(`Subtitle: ${result.object.subtitle}`);
    console.log(`Context (${result.object.context.length} chars):\n${result.object.context}\n`);

    return result.object;
  } catch (error) {
    console.error('Error generating raw source:', error);
    throw new Error(`Failed to generate source material: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Pass 2: Identify 9 gaps in the source text and extract answers
 */
export async function identifyGapsInSource(
  source: z.infer<typeof RawSourceSchema>,
  overrides?: SessionSourceOptions['gaps']
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

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_GAP_ATTEMPTS; attempt += 1) {
    try {
      const result = await generateObject({
        model,
        mode: 'json',
        schema: GapIdentificationSchema,
        schemaName: 'gap_identification',
        schemaDescription: 'Identifies gaps in German text for C1 level exercises',
        system: (overrides?.systemPrompt ?? baseSystemPrompt).replace('{{requiredCount}}', requiredCount.toString()),
        prompt: buildUserPrompt(attempt),
        temperature: 0.4,
      });

      const { gaps, gappedText } = result.object;

      if (!Array.isArray(gaps) || gaps.length !== requiredCount) {
        throw new Error(`Expected ${requiredCount} gaps but received ${gaps?.length ?? 0}`);
      }

      const requiredPlaceholdersPresent = Array.from({ length: requiredCount }, (_, index) => `GAP_${index + 1}`)
        .every(marker => gappedText.includes(`[${marker}]`));

      if (!requiredPlaceholdersPresent) {
        throw new Error('Gapped text does not contain all required placeholders');
      }

      const sanitizedGappedText = gappedText.replace(/\[(GAP_\d+)\]\]/g, '[$1]');

      gaps.sort((a, b) => a.gapNumber - b.gapNumber);

      console.log('\n**** PASS 2: GAP IDENTIFICATION ****');
      console.log(`Total gaps identified: ${gaps.length}`);
      gaps.forEach(gap => {
        console.log(`  Gap ${gap.gapNumber}: "${gap.removedWord}" at position ${gap.position}`);
      });
      console.log(`\nGapped Text:\n${sanitizedGappedText}\n`);

      return {
        theme: source.theme,
        title: source.title,
        subtitle: source.subtitle,
        rawContext: source.context,
        gappedContext: sanitizedGappedText,
        gaps: gaps.map(gap => ({
          gapNumber: gap.gapNumber,
          removedWord: gap.removedWord,
        })),
      };
    } catch (error) {
      lastError = error;
      console.warn(`Gap identification attempt ${attempt} failed:`, error);
    }
  }

  console.error('Error identifying gaps after retries:', lastError);
  throw new Error(
    `Failed to identify gaps in source after ${MAX_GAP_ATTEMPTS} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Complete two-pass source generation
 */
export async function generateSourceWithGaps(
  difficulty: QuestionDifficulty = QuestionDifficulty.INTERMEDIATE,
  options?: SessionSourceOptions
): Promise<SourceWithGaps> {
  // Pass 1: Generate raw source
  const rawSource = await generateRawSource(difficulty, options?.raw);

  // Pass 2: Identify gaps
  const sourceWithGaps = await identifyGapsInSource(rawSource, options?.gaps);

  return sourceWithGaps;
}
