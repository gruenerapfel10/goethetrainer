import type { SchedulingStrategy, SchedulingContext } from './base';
import type { CardTemplate, SchedulingState } from '@/lib/flashcards/types';
import { FeedbackRating } from '@/lib/flashcards/types';

const MIN_EASE = 1.3;
const MAX_EASE = 2.5;

const mapFeedbackToQuality = (feedback: FeedbackRating) => {
  switch (feedback) {
    case FeedbackRating.AGAIN:
      return 0;
    case FeedbackRating.HARD:
      return 3;
    case FeedbackRating.GOOD:
      return 4;
    case FeedbackRating.EASY:
      return 5;
    default:
      return 4;
  }
};

export const sm2Strategy: SchedulingStrategy = {
  id: 'sm2',
  label: 'SM-2 Classic',
  getInitialState(_card: CardTemplate, context: SchedulingContext): SchedulingState {
    return {
      due: context.now,
      interval: 0,
      easeFactor: 2.5,
      stability: 0,
      difficulty: 0.5,
    };
  },
  scheduleNext(_card, prevState, feedback, context) {
    const quality = mapFeedbackToQuality(feedback);
    let ease = prevState.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    ease = Math.max(MIN_EASE, Math.min(MAX_EASE, ease));

    let interval = 1;
    if (quality < 3) {
      interval = 1;
    } else if (prevState.interval < 1) {
      interval = 1;
    } else if (prevState.interval === 1) {
      interval = 6;
    } else {
      interval = Math.round(prevState.interval * ease);
    }

    const due = context.now + interval * 24 * 60 * 60 * 1000;

    return {
      due,
      interval,
      easeFactor: ease,
      stability: interval,
      difficulty: 1 / ease,
    };
  },
};
