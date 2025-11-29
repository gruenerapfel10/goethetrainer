import { createSupabaseServiceClient } from '@/lib/supabase/clients';
import type { ReviewEvent } from '@/lib/flashcards/types';

export class ReviewRepository {
  static async addReview(event: ReviewEvent & { userId?: string }): Promise<void> {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from('flashcard_reviews').insert({
      user_id: (event as any).userId ?? event.userId,
      deck_id: event.deckId,
      card_id: event.cardId,
      event,
    });
    if (error) throw error;
  }

  static async list(userId: string, deckId: string): Promise<ReviewEvent[]> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('flashcard_reviews')
      .select('event')
      .eq('user_id', userId)
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => row.event as ReviewEvent);
  }

  static async append(event: ReviewEvent & { userId?: string }): Promise<void> {
    return this.addReview(event);
  }
}
