import type { Deck } from '@/lib/flashcards/types';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function deckToCsv(deck: Deck): string {
  const header = 'front,back,hint,tags';
  const rows = deck.cards.map(card => {
    const cols = [card.front, card.back, card.hint ?? '', (card.tags ?? []).join('|')];
    return cols.map(value => escapeCsv(value ?? '')).join(',');
  });
  return [header, ...rows].join('\n');
}
