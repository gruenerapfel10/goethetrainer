import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { QuestionDifficulty } from './question-types';
import { SessionTypeEnum } from '../session-registry';

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
  difficulty: QuestionDifficulty = 'intermediate'
): Promise<z.infer<typeof RawSourceSchema>> {
  const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];

  const model = anthropic('claude-haiku-4-5-20251001');

  const systemPrompt = `You are a German language specialist creating Goethe C1 level reading passages.

Generate ONE German text passage (200-300 words) with theme, title, and subtitle.

Requirements:
1. ALL content in German language ONLY
2. Provide a THEME (category): ${randomTheme}
3. Provide a TITLE for the passage (5-10 words)
4. Provide a SUBTITLE (brief description 10-15 words)
5. One context passage (200-300 words, C1 level, naturally written)

The passage should be rich with vocabulary and complex sentence structures suitable for gap-filling exercises.`;

  const userPrompt = `Generate a reading passage for theme: ${randomTheme} at ${difficulty} level.`;

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
  source: z.infer<typeof RawSourceSchema>
): Promise<SourceWithGaps> {
  const model = anthropic('claude-haiku-4-5-20251001');

  const baseSystemPrompt = `You are a German language expert creating gap-fill exercises for C1 level learners.

Your task: Identify EXACTLY ${REQUIRED_GAP_COUNT} strategically placed gaps in the provided German text.

Requirements:
1. Select ${REQUIRED_GAP_COUNT} words/phrases that are:
   - Important for comprehension
   - Varied in difficulty and position
   - Between 1-3 words each
   - Distributed throughout the entire text (don't cluster them)
   - Include gaps from the beginning, middle, and end of the text
2. For each of the ${REQUIRED_GAP_COUNT} gaps:
   - Record the exact word/phrase to remove (the correct answer)
   - Record its character position in the original text
   - Provide context around the gap
3. Return the text with gaps replaced by [GAP_1], [GAP_2], ... [GAP_${REQUIRED_GAP_COUNT}] (all must be present)
4. The gaps array MUST have exactly ${REQUIRED_GAP_COUNT} elements

Return ALL ${REQUIRED_GAP_COUNT} gaps in order of appearance in the text. GAP_1 is the first gap, GAP_${REQUIRED_GAP_COUNT} is the last gap.`;

  const buildUserPrompt = (attempt: number) => `Identify and return EXACTLY ${REQUIRED_GAP_COUNT} gaps in this German text. ALL ${REQUIRED_GAP_COUNT} GAPS MUST BE RETURNED.

Theme: ${source.theme}
Title: ${source.title}
Subtitle: ${source.subtitle}

Text:
${source.context}


${attempt > 1 ? `HINWEIS: Beim letzten Versuch wurden zu wenige Lücken geliefert. Bitte gib dieses Mal unbedingt alle ${REQUIRED_GAP_COUNT} Lücken an.` : ''}

IMPORTANT: Return all ${REQUIRED_GAP_COUNT} gaps. Do not stop early. Return the gaps in order of appearance in the text.`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_GAP_ATTEMPTS; attempt += 1) {
    try {
      const result = await generateObject({
        model,
        mode: 'json',
        schema: GapIdentificationSchema,
        schemaName: 'gap_identification',
        schemaDescription: 'Identifies gaps in German text for C1 level exercises',
        system: baseSystemPrompt,
        prompt: buildUserPrompt(attempt),
        temperature: 0.4,
      });

      const { gaps, gappedText } = result.object;

      if (!Array.isArray(gaps) || gaps.length !== REQUIRED_GAP_COUNT) {
        throw new Error(`Expected ${REQUIRED_GAP_COUNT} gaps but received ${gaps?.length ?? 0}`);
      }

      const requiredPlaceholdersPresent = Array.from({ length: REQUIRED_GAP_COUNT }, (_, index) => `GAP_${index + 1}`)
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
  difficulty: QuestionDifficulty = 'intermediate'
): Promise<SourceWithGaps> {
  // Pass 1: Generate raw source
  const rawSource = await generateRawSource(difficulty);

  // Pass 2: Identify gaps
  const sourceWithGaps = await identifyGapsInSource(rawSource);

  return sourceWithGaps;
}
