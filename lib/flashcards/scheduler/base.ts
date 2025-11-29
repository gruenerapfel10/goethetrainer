import type { FeedbackRating, CardTemplate, SchedulingState } from '@/lib/flashcards/types';

export interface SchedulingContext {
  now: number;
  shownAt?: number;
  answeredAt?: number;
  dueAt?: number;
  responseMs?: number;
  lastReview?: number;
  targetRetention?: number;
}

export interface SchedulingStrategy {
  id: string;
  label: string;
  getInitialState(card: CardTemplate, context: SchedulingContext): SchedulingState;
  scheduleNext(
    card: CardTemplate,
    prevState: SchedulingState,
    feedback: FeedbackRating,
    context: SchedulingContext
  ): SchedulingState;
}
