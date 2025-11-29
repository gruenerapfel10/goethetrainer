import type { FlashcardAlgorithmImpl } from './base';
import type { ScheduledCard, FlashcardSession, FeedbackRating } from '@/lib/flashcards/types';

const pickNextByDue = (queue: ScheduledCard[]) => {
  if (queue.length === 0) return { next: null as ScheduledCard | null, remaining: [] as ScheduledCard[] };
  const sorted = [...queue].sort((a, b) => a.state.due - b.state.due);
  const [next, ...rest] = sorted;
  return { next, remaining: rest };
};

export const faustAlgorithm: FlashcardAlgorithmImpl = {
  id: 'faust',
  label: 'FAUST (due-priority)',
  initialize(queue: ScheduledCard[]) {
    const { next, remaining } = pickNextByDue(queue);
    return { active: next, remaining };
  },
  next(session: FlashcardSession, updatedActive: ScheduledCard, mode: 'finite' | 'infinite') {
    const pool = [...session.remainingQueue];
    if (mode === 'infinite') {
      pool.push(updatedActive);
    }
    const { next, remaining } = pickNextByDue(pool);
    if (!next && mode === 'infinite') {
      return { active: updatedActive, remaining: [] };
    }
    return { active: next ?? null, remaining };
  },
};
