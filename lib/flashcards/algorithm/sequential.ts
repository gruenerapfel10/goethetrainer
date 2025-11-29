import type { FlashcardAlgorithmImpl } from './base';
import type { ScheduledCard, FlashcardSession, FeedbackRating } from '@/lib/flashcards/types';

export const sequentialAlgorithm: FlashcardAlgorithmImpl = {
  id: 'sequential',
  label: 'Sequential',
  initialize(queue: ScheduledCard[]) {
    const [first, ...rest] = queue;
    return { active: first ?? null, remaining: rest };
  },
  next(_session: FlashcardSession, updatedActive: ScheduledCard, mode: 'finite' | 'infinite') {
    const remaining = [...(_session.remainingQueue ?? [])];
    const [next, ...rest] = remaining;
    if (!next && mode === 'infinite') {
      return { active: updatedActive, remaining: [] };
    }
    return { active: next ?? null, remaining: rest };
  },
};
