import { FeedbackRating } from '@/lib/flashcards/types';
import type { FeedbackPolicy } from './policy';

export const binaryPolicy: FeedbackPolicy = {
  id: 'binary',
  label: 'Black & White',
  options: [
    { label: 'Again', rating: FeedbackRating.AGAIN, tone: 'danger' },
    { label: 'Mastered', rating: FeedbackRating.GOOD, tone: 'success' },
  ],
};

export const ternaryPolicy: FeedbackPolicy = {
  id: 'ternary',
  label: 'Fail / Review / Mastered',
  options: [
    { label: 'Fail', rating: FeedbackRating.AGAIN, tone: 'danger' },
    { label: 'Review', rating: FeedbackRating.HARD, tone: 'warning' },
    { label: 'Mastered', rating: FeedbackRating.GOOD, tone: 'success' },
  ],
};

const registry = new Map<string, FeedbackPolicy>([
  [binaryPolicy.id, binaryPolicy],
  [ternaryPolicy.id, ternaryPolicy],
]);

export const getFeedbackPolicy = (id: string) => {
  const policy = registry.get(id);
  if (!policy) throw new Error(`Feedback policy ${id} not found`);
  return policy;
};

export const listFeedbackPolicies = () => Array.from(registry.values());
