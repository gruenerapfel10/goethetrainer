import { generateText } from 'ai';
import { customModel } from '@/lib/ai/models';
import { ModelId } from '@/lib/ai/model-registry';
import { SourceRepository } from '@/lib/flashcards/source-documents';
import { CardDraftRepository } from '@/lib/flashcards/drafts-repository';
import { DeckRepository } from '@/lib/flashcards/repository/memory-repo';
import { FlashcardEventLog } from '@/lib/flashcards/logs/event-log';

export async function generateDraftsFromSource(userId: string, deckId: string, sourceId: string) {
  const deck = await DeckRepository.get(userId, deckId);
  if (!deck) {
    throw new Error('Deck not found');
  }
  const source = await SourceRepository.get(userId, sourceId);
  if (!source) {
    throw new Error('Source not found');
  }

  const prompt = `You are a flashcard generator. Read the text and propose up to 3 high-quality cards in JSON with shape [{"front": string, "back": string, "hint"?: string }]. Text:\n\n${source.content}`;

  const result = await generateText({
    model: customModel(ModelId.CLAUDE_HAIKU_4_5),
    prompt,
    temperature: 0.2,
  });

  let parsed: Array<{ front: string; back: string; hint?: string }> = [];
  try {
    parsed = JSON.parse(result.text);
    if (!Array.isArray(parsed)) throw new Error('Not array');
  } catch {
    parsed = [{ front: source.title, back: source.content.slice(0, 200) }];
  }

  const created = await Promise.all(
    parsed.map(card =>
      CardDraftRepository.create(userId, {
        deckId,
        sourceId,
        front: card.front,
        back: card.back,
        hint: card.hint,
      })
    )
  );
  FlashcardEventLog.append({
    type: 'draft_generated',
    payload: { deckId, sourceId, draftIds: created.map(d => d.id) },
    timestamp: Date.now(),
  });
  return created;
}
