import type { Deck } from '@/lib/flashcards/types';

export function deckToAnkiTxt(deck: Deck): string {
  return deck.cards
    .map(card => `${card.front}\t${card.back}`)
    .join('\n');
}
