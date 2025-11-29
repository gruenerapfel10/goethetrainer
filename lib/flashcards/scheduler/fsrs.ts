import type { SchedulingStrategy, SchedulingContext } from './base';
import type { CardTemplate, SchedulingState } from '@/lib/flashcards/types';
import { FeedbackRating } from '@/lib/flashcards/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_STABILITY_DAYS = 2;
const BASE_DIFFICULTY = 0.3;
const MIN_STABILITY = 0.5;
const MAX_STABILITY = 3650; // ~10 years

const feedbackMultipliers: Record<FeedbackRating, number> = {
  [FeedbackRating.AGAIN]: 0.4,
  [FeedbackRating.HARD]: 0.8,
  [FeedbackRating.GOOD]: 1.2,
  [FeedbackRating.EASY]: 1.45,
};

const feedbackDifficultyShift: Record<FeedbackRating, number> = {
  [FeedbackRating.AGAIN]: 0.1,
  [FeedbackRating.HARD]: 0.05,
  [FeedbackRating.GOOD]: -0.02,
  [FeedbackRating.EASY]: -0.04,
};

const targetFromContext = (context: SchedulingContext) => {
  const candidate = context.targetRetention ?? 0.9;
  if (Number.isFinite(candidate) && candidate > 0.5 && candidate < 0.99) return candidate;
  return 0.9;
};

const decay = (elapsedMs: number, stabilityDays: number) => {
  const stabilityMs = Math.max(DAY_MS * MIN_STABILITY, stabilityDays * DAY_MS);
  return Math.exp(-Math.max(0, elapsedMs) / stabilityMs);
};

export const fsrsStrategy: SchedulingStrategy = {
  id: 'fsrs-lite',
  label: 'FSRS (Lite)',
  getInitialState(_card: CardTemplate, context: SchedulingContext): SchedulingState {
    return {
      due: context.now,
      interval: 0,
      easeFactor: 2.3,
      stability: BASE_STABILITY_DAYS,
      difficulty: BASE_DIFFICULTY,
      lastReview: undefined,
      reps: 0,
      lapses: 0,
    };
  },
  scheduleNext(_card, prevState, feedback, context) {
    const now = context.now;
    const elapsedSinceLastMs =
      prevState.lastReview && Number.isFinite(prevState.lastReview)
        ? Math.max(0, now - (prevState.lastReview as number))
        : prevState.interval * DAY_MS;
    const retrievability = decay(elapsedSinceLastMs, prevState.stability);

    // response time moderation: slower answers dampen the gain
    const responseMs = context.responseMs ?? null;
    const slowFactor =
      responseMs && responseMs > 0
        ? Math.max(0.7, Math.min(1.1, 1 - Math.log10(responseMs / 1500 + 1) * 0.15))
        : 1;

    const mult = (feedbackMultipliers[feedback] ?? 1) * slowFactor;
    const stabilityGain = prevState.stability * (mult - 1);
    const stability = Math.min(
      MAX_STABILITY,
      Math.max(MIN_STABILITY, prevState.stability + stabilityGain + retrievability * 0.2)
    );

    const difficultyShift = feedbackDifficultyShift[feedback] ?? 0;
    const difficulty = Math.min(
      0.95,
      Math.max(0.05, prevState.difficulty + difficultyShift * (feedback === FeedbackRating.AGAIN ? 1.5 : 1))
    );

    const requestRetention = targetFromContext(context);
    const intervalDays = Math.max(
      1,
      Math.round(stability * Math.log(1 / requestRetention))
    );
    const ease = Math.max(1.3, Math.min(2.6, prevState.easeFactor + (mult - 1) * 0.15));

    const lapses = prevState.lapses ?? 0;
    const reps = (prevState.reps ?? 0) + 1;

    return {
      due: now + intervalDays * DAY_MS,
      interval: intervalDays,
      easeFactor: ease,
      stability,
      difficulty,
      lastReview: now,
      reps,
      lapses: feedback === FeedbackRating.AGAIN ? lapses + 1 : lapses,
    };
  },
};
