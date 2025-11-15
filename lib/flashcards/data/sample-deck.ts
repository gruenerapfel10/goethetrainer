import type { Deck } from '@/lib/flashcards/types';
import { FlashcardDeckType } from '@/lib/flashcards/types';

export const sampleDeck: Deck = {
  id: 'sample-deck',
  title: 'German Basics',
  description: 'Foundational vocabulary and phrases',
  createdAt: new Date().toISOString(),
  status: 'published',
  categories: ['greetings', 'basic-phrases'],
  settings: {
    schedulerId: 'fsrs-lite',
    feedbackPolicyId: 'ternary',
  },
  cards: [
    {
      id: 'card-1',
      type: FlashcardDeckType.BASIC,
      front: 'Guten Morgen',
      back: 'Good morning',
      tags: ['greeting'],
    },
    {
      id: 'card-2',
      type: FlashcardDeckType.BASIC,
      front: 'Danke',
      back: 'Thank you',
      tags: ['greeting'],
    },
    {
      id: 'card-3',
      type: FlashcardDeckType.BASIC,
      front: 'Wie geht es dir?',
      back: 'How are you?',
      tags: ['smalltalk'],
    },
    {
      id: 'card-4',
      type: FlashcardDeckType.BASIC,
      front: 'Entschuldigung',
      back: 'Excuse me / Sorry',
      tags: ['polite'],
    },
  ],
};
