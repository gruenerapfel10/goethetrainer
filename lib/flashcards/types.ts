export enum FlashcardDeckType {
  BASIC = 'basic',
  CLOZE = 'cloze',
}

export enum FlashcardStudyMode {
  FLASHCARD = 'flashcard',
}

export type CardTemplate = {
  id: string;
  type: FlashcardDeckType;
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
};

export type Deck = {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  cards: CardTemplate[];
  categories: string[];
  createdAt: string;
  status: 'draft' | 'published';
  settings: {
    schedulerId: string;
    feedbackPolicyId: string;
  };
};

export type DeckCategory = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
};

export type ReviewEvent = {
  cardId: string;
  deckId: string;
  userId: string;
  timestamp: number;
  feedback: FeedbackRating;
  prevInterval: number;
  nextInterval: number;
};

export enum FeedbackRating {
  AGAIN = 0,
  HARD = 1,
  GOOD = 2,
  EASY = 3,
}

export interface SchedulingState {
  due: number;
  interval: number;
  easeFactor: number;
  stability: number;
  difficulty: number;
}

export interface ScheduledCard {
  card: CardTemplate;
  state: SchedulingState;
}

export interface FlashcardSession {
  id: string;
  deckId: string;
  userId: string;
  activeCard: ScheduledCard | null;
  remainingQueue: ScheduledCard[];
  completed: ReviewEvent[];
  schedulerId: string;
  deckMode?: 'finite' | 'infinite';
  startedAt: number;
  endedAt?: number | null;
}

export interface SourceDocument {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  origin: {
    type: 'manual' | 'url' | 'upload';
    reference?: string;
  };
}

export interface CardDraft {
  id: string;
  userId: string;
  deckId: string;
  sourceId: string;
  front: string;
  back: string;
  hint?: string;
  createdAt: string;
}
