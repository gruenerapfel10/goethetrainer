export enum FlashcardDeckType {
  BASIC = 'basic',
  CLOZE = 'cloze',
}

export enum FlashcardStudyMode {
  FLASHCARD = 'flashcard',
}

export enum FlashcardAlgorithm {
  SEQUENTIAL = 'sequential',
  FAUST = 'faust',
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
  shownAt?: number | null;
  answeredAt?: number | null;
  dueAt?: number | null;
  responseMs?: number | null;
  flags?: {
    revealedEarly?: boolean;
    usedHint?: boolean;
  };
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
   /** unix ms of last review */
  lastReview?: number;
  reps?: number;
  lapses?: number;
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
  algorithm?: FlashcardAlgorithm;
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
