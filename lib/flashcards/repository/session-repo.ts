import { createSupabaseServiceClient } from '@/lib/supabase/clients';
import type { FlashcardSession } from '@/lib/flashcards/types';

export class SessionRepository {
  static async create(session: FlashcardSession): Promise<void> {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from('flashcard_sessions').insert({
      id: session.id,
      deck_id: session.deckId,
      user_id: session.userId,
      status: 'active',
      session,
      started_at: new Date(session.startedAt),
    });
    if (error) throw error;
  }

  static async update(session: FlashcardSession): Promise<void> {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from('flashcard_sessions')
      .update({
        session,
        status: session.activeCard ? 'active' : 'completed',
        started_at: new Date(session.startedAt),
        ended_at: session.activeCard ? null : new Date(),
      })
      .eq('id', session.id)
      .eq('user_id', session.userId);
    if (error) throw error;
  }

  static async get(userId: string, id: string): Promise<FlashcardSession | null> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('flashcard_sessions')
      .select('session')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data?.session) return null;
    return data.session as FlashcardSession;
  }
}
