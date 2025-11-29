import { createSupabaseServiceClient } from '@/lib/supabase/clients';
import type { SchedulingState } from '@/lib/flashcards/types';

export class SchedulingStateRepository {
  static async listDeckStates(userId: string, deckId: string): Promise<Map<string, SchedulingState>> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('flashcard_states')
      .select('card_id, state')
      .eq('user_id', userId)
      .eq('deck_id', deckId);
    if (error) throw error;
    const map = new Map<string, SchedulingState>();
    (data ?? []).forEach(row => {
      const cardId = row.card_id as string;
      if (cardId && row.state) {
        map.set(cardId, row.state as SchedulingState);
      }
    });
    return map;
  }

  static async set(
    userId: string,
    deckId: string,
    cardId: string,
    state: SchedulingState
  ): Promise<void> {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from('flashcard_states')
      .upsert({
        user_id: userId,
        deck_id: deckId,
        card_id: cardId,
        state,
      });
    if (error) throw error;
  }
}
