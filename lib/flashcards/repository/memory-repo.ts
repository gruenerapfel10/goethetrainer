import type { Deck, CardTemplate, FlashcardSession, ReviewEvent, SchedulingState, FeedbackRating } from '@/lib/flashcards/types';

// Minimal in-memory stubs to keep flashcards feature compiling without Firebase.

export class DeckRepository {
  private decks: Deck[] = [];

  async listPublished(): Promise<Deck[]> {
    return this.decks.filter(d => d.status === 'published');
  }

  async listAll(): Promise<Deck[]> {
    return this.decks;
  }

  async getDeck(id: string): Promise<Deck | null> {
    return this.decks.find(d => d.id === id) ?? null;
  }

  async saveDeck(deck: Deck): Promise<void> {
    const idx = this.decks.findIndex(d => d.id === deck.id);
    if (idx >= 0) this.decks[idx] = deck;
    else this.decks.push(deck);
  }
}

export class ReviewRepository {
  private reviews: ReviewEvent[] = [];
  async addReview(event: ReviewEvent): Promise<void> {
    this.reviews.push(event);
  }
}

export class SchedulingStateRepository {
  private states: SchedulingState[] = [];
  async saveState(state: SchedulingState): Promise<void> {
    const idx = this.states.findIndex(s => s.cardId === state.cardId);
    if (idx >= 0) this.states[idx] = state;
    else this.states.push(state);
  }
}

export class SessionRepository {
  private sessions: FlashcardSession[] = [];
  async saveSession(session: FlashcardSession): Promise<void> {
    const idx = this.sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) this.sessions[idx] = session;
    else this.sessions.push(session);
  }

  async getSession(id: string): Promise<FlashcardSession | null> {
    return this.sessions.find(s => s.id === id) ?? null;
  }
}

export class SessionFactory {
  createSession(deck: Deck): FlashcardSession {
    return {
      id: crypto.randomUUID(),
      deckId: deck.id,
      userId: deck.ownerId ?? 'anonymous',
      startedAt: new Date(),
      status: 'active',
      cards: deck.cards as CardTemplate[],
      currentIndex: 0,
      answers: [],
    };
  }
}

