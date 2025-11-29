import type { DeckCategory } from '@/lib/flashcards/types';

export class CategoryRepository {
  private static categoriesByUser: Map<string, DeckCategory[]> = new Map();

  static async list(userKey: string): Promise<DeckCategory[]> {
    return this.categoriesByUser.get(userKey) ?? [];
  }

  static async create(userKey: string, name: string): Promise<DeckCategory> {
    const category: DeckCategory = {
      id: crypto.randomUUID(),
      userId: userKey,
      name,
      createdAt: new Date().toISOString(),
    };
    const existing = this.categoriesByUser.get(userKey) ?? [];
    existing.push(category);
    this.categoriesByUser.set(userKey, existing);
    return category;
  }
}
