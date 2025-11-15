import type { FeedbackRating } from '@/lib/flashcards/types';

export interface FeedbackOption {
  label: string;
  rating: FeedbackRating;
  tone: 'danger' | 'warning' | 'default' | 'success';
}

export interface FeedbackPolicy {
  id: string;
  label: string;
  options: FeedbackOption[];
}
