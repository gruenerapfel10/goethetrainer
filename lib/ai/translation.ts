import { generateObject } from 'ai';
import { z } from 'zod';
import { customModel } from '@/lib/ai/models';
import { ModelId } from '@/lib/ai/model-registry';

export async function translateToEnglish(text: string, context?: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  const trimmedContext = context?.trim();
  const hasContext = !!trimmedContext && trimmedContext !== trimmed;

  const prompt = hasContext
    ? `You are given a German sentence or short passage and a specific selected phrase from it.\n\nContext:\n"""${trimmedContext}"""\n\nSelected phrase to translate:\n"""${trimmed}"""\n\nTranslate the selected phrase into natural English, choosing the best meaning given the context. Return JSON with a single field "translation" containing only the English translation of the selected phrase.`
    : `Translate to natural English:\n"""${trimmed}"""\nReturn JSON with a single field "translation".`;

  const { object } = await generateObject({
    model: customModel(ModelId.CLAUDE_HAIKU_4_5),
    temperature: 0.2,
    system:
      'You are a precise professional translator specializing in German-to-English conversions. Output only JSON that matches the schema. Keep the translation concise and natural; no commentary.',
    prompt,
    schema: z.object({
      translation: z.string().describe('The English translation of the provided text.'),
    }),
  });

  return object.translation.trim();
}
