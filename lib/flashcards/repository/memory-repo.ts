import type {
  Deck,
  CardTemplate,
  FlashcardSession,
  ReviewEvent,
  SchedulingState,
} from '@/lib/flashcards/types';
import { FlashcardDeckType } from '@/lib/flashcards/types';

// Minimal in-memory stubs to keep flashcards feature compiling without Firebase.

export class DeckRepository {
  private static decks: Deck[] = [];

  static async list(userId: string, status?: 'draft' | 'published'): Promise<Deck[]> {
    return this.decks.filter(d => d.userId === userId && (status ? d.status === status : true));
  }

  static async get(userId: string, id: string): Promise<Deck | null> {
    return this.decks.find(d => d.userId === userId && d.id === id) ?? null;
  }

  static async create(
    userId: string,
    data: {
      title: string;
      description?: string;
      categories?: string[];
      cards?: Array<Partial<CardTemplate>>;
    }
  ): Promise<Deck> {
    const deck: Deck = {
      id: crypto.randomUUID(),
      userId,
      title: data.title,
      description: data.description,
      cards: (data.cards ?? []).map(card => ({
        id: crypto.randomUUID(),
        type: card.type ?? FlashcardDeckType.BASIC,
        front: card.front ?? '',
        back: card.back ?? '',
        hint: card.hint,
        tags: card.tags,
      })),
      categories: data.categories ?? [],
      createdAt: new Date().toISOString(),
      status: 'draft',
      settings: {
        schedulerId: 'default',
        feedbackPolicyId: 'default',
      },
    };
    this.decks.push(deck);
    return deck;
  }

  static async addCard(
    userId: string,
    deckId: string,
    card: { type: FlashcardDeckType; front: string; back: string; hint?: string; tags?: string[] }
  ): Promise<Deck> {
    const deck = await this.get(userId, deckId);
    if (!deck) {
      throw new Error('Deck not found');
    }
    const cardTemplate: CardTemplate = {
      id: crypto.randomUUID(),
      type: card.type,
      front: card.front,
      back: card.back,
      hint: card.hint,
      tags: card.tags,
    };
    deck.cards.push(cardTemplate);
    return deck;
  }

  static async updateSettings(
    userId: string,
    deckId: string,
    settings: Deck['settings']
  ): Promise<Deck> {
    const deck = await this.get(userId, deckId);
    if (!deck) {
      throw new Error('Deck not found');
    }
    deck.settings = settings;
    return deck;
  }

  static async publish(userId: string, deckId: string): Promise<Deck> {
    const deck = await this.get(userId, deckId);
    if (!deck) {
      throw new Error('Deck not found');
    }
    deck.status = 'published';
    return deck;
  }
}

export class ReviewRepository {
  private static reviews: ReviewEvent[] = [];

  static async addReview(event: ReviewEvent): Promise<void> {
    this.reviews.push(event);
  }

  static async list(userId: string, deckId: string): Promise<ReviewEvent[]> {
    return this.reviews.filter(r => (r as any).userId === userId && (r as any).deckId === deckId);
  }

  static async append(event: ReviewEvent): Promise<void> {
    return this.addReview(event);
  }
}

export class SchedulingStateRepository {
  private static states: SchedulingState[] = [];

  static async saveState(state: SchedulingState): Promise<void> {
    const idx = this.states.findIndex(s => (s as any).cardId === (state as any).cardId);
    if (idx >= 0) this.states[idx] = state;
    else this.states.push(state);
  }

  static async listDeckStates(userId: string, deckId: string): Promise<Map<string, SchedulingState>> {
    const map = new Map<string, SchedulingState>();
    this.states
      .filter(s => (s as any).userId === userId && (s as any).deckId === deckId)
      .forEach(state => {
        map.set((state as any).cardId ?? crypto.randomUUID(), state);
      });
    return map;
  }

  static async set(
    userId: string,
    deckId: string,
    cardId: string,
    state: SchedulingState
  ): Promise<void> {
    const existingIdx = this.states.findIndex(
      s => (s as any).userId === userId && (s as any).deckId === deckId && (s as any).cardId === cardId
    );
    const withIds = { ...(state as any), userId, deckId, cardId } as SchedulingState;
    if (existingIdx >= 0) {
      this.states[existingIdx] = withIds;
    } else {
      this.states.push(withIds);
    }
  }
}

export class SessionRepository {
  private static sessions: FlashcardSession[] = [];

  static async create(session: FlashcardSession): Promise<void> {
    this.sessions.push(session);
  }

  static async update(session: FlashcardSession): Promise<void> {
    const idx = this.sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) this.sessions[idx] = session;
    else this.sessions.push(session);
  }

  static async get(userId: string, id: string): Promise<FlashcardSession | null> {
    return this.sessions.find(s => s.id === id && s.userId === userId) ?? null;
  }
}

export class SessionFactory {
  static create(
    userId: string,
    deck: Deck,
    queue: Array<{ card: CardTemplate; state: SchedulingState }>,
    schedulerId: string
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
    } as any;
  }
}
