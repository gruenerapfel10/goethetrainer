import type { CardDraft } from '@/lib/flashcards/types';

export class CardDraftRepository {
  private static drafts: CardDraft[] = [];

  static async list(userId: string, deckId?: string): Promise<CardDraft[]> {
    return this.drafts.filter(d => d.userId === userId && (deckId ? d.deckId === deckId : true));
  }

  static async get(userId: string, id: string): Promise<CardDraft | null> {
    return this.drafts.find(d => d.userId === userId && d.id === id) ?? null;
  }

  static async create(
    userId: string,
    draft: Omit<CardDraft, 'id' | 'userId' | 'createdAt'>
  ): Promise<CardDraft> {
    const full: CardDraft = {
      ...draft,
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    };
    this.drafts.push(full);
    return full;
  }

  static async delete(userId: string, id: string): Promise<void> {
    this.drafts = this.drafts.filter(d => !(d.userId === userId && d.id === id));
  }
}
