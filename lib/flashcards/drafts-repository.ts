import type { CardDraft } from '@/lib/flashcards/types';

export class CardDraftRepository {
  private drafts: CardDraft[] = [];

  async list(userId: string): Promise<CardDraft[]> {
    return this.drafts.filter(d => d.userId === userId);
  }

  async get(id: string): Promise<CardDraft | null> {
    return this.drafts.find(d => d.id === id) ?? null;
  }

  async create(draft: CardDraft): Promise<string> {
    this.drafts.push(draft);
    return draft.id;
  }

  async delete(id: string): Promise<void> {
    this.drafts = this.drafts.filter(d => d.id !== id);
  }
}
