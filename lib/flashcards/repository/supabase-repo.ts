import { createSupabaseServiceClient } from '@/lib/supabase/clients';
import type { Deck, CardTemplate } from '@/lib/flashcards/types';
import { FlashcardDeckType } from '@/lib/flashcards/types';

type DeckRow = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  type?: string | null;
  cards?: CardTemplate[];
  categories?: string[] | null;
  settings?: Deck['settings'] | null;
  created_at?: string;
  updated_at?: string;
};

const mapDeck = (row: DeckRow): Deck => ({
  id: row.id,
  userId: row.owner_id,
  title: row.title,
  description: row.description ?? undefined,
  cards: Array.isArray(row.cards) ? row.cards : [],
  categories: Array.isArray(row.categories) ? row.categories : [],
  createdAt: row.created_at ?? new Date().toISOString(),
  status: (row.status as Deck['status']) ?? 'draft',
  settings: {
    schedulerId: row.settings?.schedulerId ?? 'fsrs-lite',
    feedbackPolicyId: row.settings?.feedbackPolicyId ?? 'ternary',
  },
});

export class DeckRepository {
  static async list(userId: string, status?: 'draft' | 'published'): Promise<Deck[]> {
    const supabase = createSupabaseServiceClient();
    let query = supabase.from('flashcard_decks').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapDeck);
  }

  static async get(userId: string, id: string): Promise<Deck | null> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('id', id)
      .eq('owner_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    return mapDeck(data as DeckRow);
  }

  static async create(
    userId: string,
    data: {
      title: string;
      description?: string;
      categories?: string[];
      cards?: Array<Partial<CardTemplate>>;
    }
  ): Promise<Deck> {
    const supabase = createSupabaseServiceClient();
    const id = crypto.randomUUID();
    const cards = (data.cards ?? []).map(card => ({
      id: card.id ?? crypto.randomUUID(),
      type: card.type ?? FlashcardDeckType.BASIC,
      front: card.front ?? '',
      back: card.back ?? '',
      hint: card.hint,
      tags: card.tags,
    }));
    const { data: inserted, error } = await supabase
      .from('flashcard_decks')
      .insert({
        id,
        owner_id: userId,
        title: data.title,
        description: data.description ?? null,
        status: 'draft',
        type: 'standard',
        cards,
        categories: data.categories ?? [],
        settings: { schedulerId: 'default', feedbackPolicyId: 'default' },
      })
      .select()
      .single();
    if (error) throw error;
    return mapDeck(inserted as DeckRow);
  }

  static async addCard(
    userId: string,
    deckId: string,
    card: { type: FlashcardDeckType; front: string; back: string; hint?: string; tags?: string[] }
  ): Promise<Deck> {
    const deck = await this.get(userId, deckId);
    if (!deck) throw new Error('Deck not found');
    const newCard: CardTemplate = {
      id: crypto.randomUUID(),
      type: card.type,
      front: card.front,
      back: card.back,
      hint: card.hint,
      tags: card.tags,
    };
    const updatedCards = [...deck.cards, newCard];
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('flashcard_decks')
      .update({ cards: updatedCards })
      .eq('id', deckId)
      .eq('owner_id', userId)
      .select()
      .single();
    if (error) throw error;
    return mapDeck(data as DeckRow);
  }

  static async updateSettings(
    userId: string,
    deckId: string,
    settings: Partial<Deck['settings']>
  ): Promise<Deck> {
    const deck = await this.get(userId, deckId);
    if (!deck) throw new Error('Deck not found');
    const nextSettings = {
      ...deck.settings,
      ...settings,
    };
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('flashcard_decks')
      .update({ settings: nextSettings })
      .eq('id', deckId)
      .eq('owner_id', userId)
      .select()
      .single();
    if (error) throw error;
    return mapDeck(data as DeckRow);
  }

  static async publish(userId: string, deckId: string): Promise<Deck> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('flashcard_decks')
      .update({ status: 'published' })
      .eq('id', deckId)
      .eq('owner_id', userId)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error('Deck not found');
    return mapDeck(data as DeckRow);
  }
}
