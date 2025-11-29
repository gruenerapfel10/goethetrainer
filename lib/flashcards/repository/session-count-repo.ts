import { createSupabaseServiceClient } from '@/lib/supabase/clients';

export class SessionCountRepository {
  static async getCounts(): Promise<Map<string, number>> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.from('flashcard_sessions_per_deck').select('deck_id, session_count');
    if (error) throw error;
    const map = new Map<string, number>();
    (data ?? []).forEach(row => {
      const deckId = row.deck_id as string;
      const count = Number(row.session_count) || 0;
      map.set(deckId, count);
    });
    return map;
  }
}
