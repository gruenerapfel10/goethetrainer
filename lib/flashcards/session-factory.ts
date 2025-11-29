import type { FlashcardSession, CardTemplate, SchedulingState } from '@/lib/flashcards/types';

export class SessionFactory {
  static create(
    userId: string,
    deck: { id: string },
    queue: Array<{ card: CardTemplate; state: SchedulingState }>,
    schedulerId: string,
    mode: 'finite' | 'infinite'
  ): FlashcardSession {
    const [first, ...rest] = queue;
    return {
      id: crypto.randomUUID(),
      deckId: deck.id,
      userId,
      schedulerId,
      activeCard: first ? { card: first.card, state: first.state } : null,
      remainingQueue: rest,
      completed: [],
      startedAt: Date.now(),
      deckMode: mode,
    } as any;
  }
}
