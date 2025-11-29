import { createSupabaseServiceClient } from '@/lib/supabase/clients';

export class InteractionRepository {
  static async log(event: {
    userId: string;
    deckId: string;
    sessionId: string;
    cardId: string;
    eventType: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from('flashcard_interactions').insert({
      user_id: event.userId,
      deck_id: event.deckId,
      session_id: event.sessionId,
      card_id: event.cardId,
      event_type: event.eventType,
      metadata: event.metadata ?? {},
    });
    if (error) throw error;
  }
}
