import type { SourceDocument } from '@/lib/flashcards/types';

export class SourceRepository {
  private docs: SourceDocument[] = [];

  async list(userId: string): Promise<SourceDocument[]> {
    return this.docs.filter(d => d.userId === userId);
  }

  async get(id: string): Promise<SourceDocument | null> {
    return this.docs.find(d => d.id === id) ?? null;
  }

  async create(doc: SourceDocument): Promise<void> {
    this.docs.push(doc);
  }
}
