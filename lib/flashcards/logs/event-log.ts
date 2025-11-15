export type FlashcardEvent =
  | {
      type: 'source_created';
      payload: { id: string; origin: string };
      timestamp: number;
    }
  | {
      type: 'draft_generated';
      payload: { deckId: string; sourceId: string; draftIds: string[] };
      timestamp: number;
    }
  | {
      type: 'card_added';
      payload: { deckId: string; cardId: string; sourceId?: string };
      timestamp: number;
    };

const events: FlashcardEvent[] = [];

export const FlashcardEventLog = {
  append(event: FlashcardEvent) {
    events.push(event);
  },
  list() {
    return [...events];
  },
};
