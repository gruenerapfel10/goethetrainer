import type { SchedulingStrategy, SchedulingContext } from './base';
import type { CardTemplate, SchedulingState } from '@/lib/flashcards/types';
import { FeedbackRating } from '@/lib/flashcards/types';

const BASE_STABILITY = 2;
const BASE_DIFFICULTY = 0.3;

const feedbackWeights: Record<FeedbackRating, number> = {
  [FeedbackRating.AGAIN]: -0.6,
  [FeedbackRating.HARD]: -0.2,
  [FeedbackRating.GOOD]: 0.3,
  [FeedbackRating.EASY]: 0.5,
};

export const fsrsStrategy: SchedulingStrategy = {
  id: 'fsrs-lite',
  label: 'FSRS (Lite)',
  getInitialState(_card: CardTemplate, context: SchedulingContext): SchedulingState {
    return {
      due: context.now,
      interval: 0,
      easeFactor: 2.3,
      stability: BASE_STABILITY,
      difficulty: BASE_DIFFICULTY,
    };
  },
  scheduleNext(_card, prevState, feedback, context) {
    const weight = feedbackWeights[feedback] ?? 0;
    const stability = Math.max(1, prevState.stability + weight * prevState.stability * 0.4);
    const difficulty = Math.min(0.95, Math.max(0.05, prevState.difficulty - weight * 0.05));
    const retrievability = Math.exp(-context.now / (stability * 24 * 60 * 60 * 1000));
    const intervalDays = Math.max(1, Math.round(stability * (feedback === FeedbackRating.AGAIN ? 0.3 : 1 + retrievability)));
    const ease = Math.max(1.3, Math.min(2.6, prevState.easeFactor + weight * 0.1));

    return {
      due: context.now + intervalDays * 24 * 60 * 60 * 1000,
      interval: intervalDays,
      easeFactor: ease,
      stability,
      difficulty,
    };
  },
};
