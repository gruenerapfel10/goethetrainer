import type { SourceDocument } from '@/lib/flashcards/types';

export class SourceRepository {
  private static docs: SourceDocument[] = [];

  static async list(userId: string): Promise<SourceDocument[]> {
    return this.docs.filter(d => d.userId === userId);
  }

  static async get(userId: string, id: string): Promise<SourceDocument | null> {
    return this.docs.find(d => d.userId === userId && d.id === id) ?? null;
  }

  static async create(
    userId: string,
    doc: Omit<SourceDocument, 'id' | 'userId' | 'createdAt'>
  ): Promise<SourceDocument> {
    const full: SourceDocument = {
      ...doc,
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    };
    this.docs.push(full);
    return full;
  }

  static async createFromUrl(userId: string, url: string, title?: string) {
    return this.create(userId, {
      title: title ?? url,
      content: url,
      origin: { type: 'url', reference: url },
    });
  }

  static async createFromText(
    userId: string,
    doc: { title: string; content: string; origin: SourceDocument['origin'] }
  ) {
    return this.create(userId, doc);
  }
}
