import type { Deck } from '@/lib/flashcards/types';

export interface RetentionPoint {
  date: string;
  attempts: number;
  correct: number;
  successRate: number;
}

export interface MasteryStats {
  total: number;
  mastered: number;
  percentage: number;
}

export interface WorkloadForecastPoint {
  date: string;
  count: number;
}

export interface WorkloadStats {
  overdue: number;
  dueToday: number;
  dueNext7Days: number;
  forecast: WorkloadForecastPoint[];
}

export interface ForgettingRiskCard {
  cardId: string;
  front: string;
  due: string;
  risk: number;
}

export interface ForgettingRiskStats {
  averageRisk: number;
  highRiskCards: ForgettingRiskCard[];
}

export interface TagStatEntry {
  tag: string;
  total: number;
  mastered: number;
  due: number;
}

export interface DeckAnalytics {
  deckId: string;
  deckTitle: string;
  retention: RetentionPoint[];
  mastery: MasteryStats;
  workload: WorkloadStats;
  forgetting: ForgettingRiskStats;
  tagBreakdown: TagStatEntry[];
  lastUpdated: string;
  sessionCount?: number;
}

export interface GlobalAnalyticsSummary {
  totalDecks: number;
  totalCards: number;
  cardsMastered: number;
  averageRetention: number;
  upcomingReviews: number;
}

export interface FlashcardAnalyticsBundle {
  summary: GlobalAnalyticsSummary;
  decks: DeckAnalytics[];
}

export type AnalyticsExportFormat = 'json' | 'csv';

export type DeckWithStats = Deck & { masteredCards?: number };
