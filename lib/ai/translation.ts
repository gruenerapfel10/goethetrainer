import { generateText } from 'ai';
import { customModel } from '@/lib/ai/models';
import { ModelId } from '@/lib/ai/model-registry';

export async function translateToEnglish(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  const result = await generateText({
    model: customModel(ModelId.GPT_5_NANO),
    temperature: 0.2,
    system:
      'You are a concise professional translator. Respond with a natural-sounding English translation of the provided text. Do not add commentary.',
    prompt: `Translate the following text to natural English:\n\n${trimmed}\n\nEnglish translation:`,
  });

  return result.text.trim();
}
