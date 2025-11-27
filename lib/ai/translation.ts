import { generateObject } from 'ai';
import { z } from 'zod';
import { customModel } from '@/lib/ai/models';
import { ModelId } from '@/lib/ai/model-registry';

export async function translateToEnglish(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  const { object } = await generateObject({
    model: customModel(ModelId.CLAUDE_HAIKU_4_5),
    temperature: 0.2,
    system:
      'You are a precise professional translator specializing in German-to-English conversions. Output only JSON that matches the schema. Keep the translation concise and natural; no commentary.',
    prompt: `Translate to natural English:\n"""${trimmed}"""\nReturn JSON with a single field "translation".`,
    schema: z.object({
      translation: z.string().describe('The English translation of the provided text.'),
    }),
  });

  return object.translation.trim();
}
