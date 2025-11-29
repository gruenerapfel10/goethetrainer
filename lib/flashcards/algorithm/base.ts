import type { ScheduledCard, FlashcardSession, FeedbackRating } from '@/lib/flashcards/types';

export type AlgorithmInitResult = {
  active: ScheduledCard | null;
  remaining: ScheduledCard[];
};

export type AlgorithmNextResult = {
  active: ScheduledCard | null;
  remaining: ScheduledCard[];
};

export interface FlashcardAlgorithmImpl {
  id: string;
  label: string;
  initialize(queue: ScheduledCard[], mode: 'finite' | 'infinite'): AlgorithmInitResult;
  next(
    session: FlashcardSession,
    updatedActive: ScheduledCard,
    mode: 'finite' | 'infinite',
    feedback: FeedbackRating
  ): AlgorithmNextResult;
}
