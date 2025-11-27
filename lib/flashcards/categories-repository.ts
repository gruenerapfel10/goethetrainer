import type { DeckCategory } from '@/lib/flashcards/types';

export class CategoryRepository {
  private categories: DeckCategory[] = [];

  async getAll(): Promise<DeckCategory[]> {
    return this.categories;
  }

  async create(category: DeckCategory): Promise<void> {
    this.categories.push(category);
  }
}
