import type { DeckCategory } from '@/lib/flashcards/types';

export class CategoryRepository {
  private static categoriesByUser: Map<string, DeckCategory[]> = new Map();

  static async list(userId: string): Promise<DeckCategory[]> {
    return this.categoriesByUser.get(userId) ?? [];
  }

  static async create(userId: string, name: string): Promise<DeckCategory> {
    const category: DeckCategory = {
      id: crypto.randomUUID(),
      userId,
      name,
      createdAt: new Date().toISOString(),
    };
    const existing = this.categoriesByUser.get(userId) ?? [];
    existing.push(category);
    this.categoriesByUser.set(userId, existing);
    return category;
  }
}
