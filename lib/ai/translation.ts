import { generateText } from 'ai';
import { customModel } from '@/lib/ai/models';
import { ModelId } from '@/lib/ai/model-registry';

export async function translateToEnglish(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  const result = await generateText({
    model: customModel(ModelId.CLAUDE_HAIKU_4_5),
    temperature: 0.2,
    system:
      'You are a precise professional translator specializing in German-to-English conversions. Translate only the provided text into natural English, without commentary. If the text contains German verbs in any conjugated form (e.g., "geht", "geringt", "sind"), mentally revert them to their infinitive forms before choosing the best English equivalent.',
    prompt: `Translate the following text to natural English. Think of German verbs by their infinitive forms before translating:\n\n${trimmed}\n\nEnglish translation:`,
  });

  return result.text.trim();
}
