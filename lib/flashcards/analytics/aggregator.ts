import { DeckRepository } from '@/lib/flashcards/repository/supabase-repo';
import { ReviewRepository } from '@/lib/flashcards/repository/review-repo';
import { SchedulingStateRepository } from '@/lib/flashcards/repository/state-repo';
import { SessionCountRepository } from '@/lib/flashcards/repository/session-count-repo';
import { FeedbackRating, type CardTemplate, type Deck, type ReviewEvent, type SchedulingState } from '@/lib/flashcards/types';
import type {
  DeckAnalytics,
  FlashcardAnalyticsBundle,
  ForgettingRiskCard,
  ForgettingRiskStats,
  MasteryStats,
  RetentionPoint,
  TagStatEntry,
  WorkloadStats,
} from '@/lib/flashcards/analytics/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_WINDOW_DAYS = 14;
const MASTERED_INTERVAL_DAYS = 21;
const HIGH_RISK_THRESHOLD = 0.55;

const successRatings = new Set<FeedbackRating>([FeedbackRating.GOOD, FeedbackRating.EASY]);

const startOfDay = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
};

const buildRetentionSeries = (events: ReviewEvent[]): RetentionPoint[] => {
  const now = Date.now();
  const buckets: RetentionPoint[] = [];
  for (let i = RETENTION_WINDOW_DAYS - 1; i >= 0; i -= 1) {
    const dayStart = startOfDay(now - i * DAY_MS);
    const dayEnd = dayStart + DAY_MS;
    const slice = events.filter(event => event.timestamp >= dayStart && event.timestamp < dayEnd);
    const correct = slice.filter(event => successRatings.has(event.feedback)).length;
    const attempts = slice.length;
    buckets.push({
      date: new Date(dayStart).toISOString(),
      attempts,
      correct,
      successRate: attempts === 0 ? 0 : Number((correct / attempts) * 100),
    });
  }
  return buckets;
};

const ensureState = (state: SchedulingState | undefined, now: number): SchedulingState => {
  if (state) return state;
  return {
    due: now,
    interval: 0,
    easeFactor: 2.3,
    stability: 1,
    difficulty: 0.5,
    lastReview: undefined,
    reps: 0,
    lapses: 0,
  };
};

const computeMastery = (states: Map<string, SchedulingState>, totalCards: number): MasteryStats => {
  if (totalCards === 0) {
    return { total: 0, mastered: 0, percentage: 0 };
  }
  let mastered = 0;
  states.forEach(state => {
    if (state.interval >= MASTERED_INTERVAL_DAYS) {
      mastered += 1;
    }
  });
  return {
    total: totalCards,
    mastered,
    percentage: Number(((mastered / totalCards) * 100).toFixed(1)),
  };
};

const computeWorkload = (states: Map<string, SchedulingState>, now: number): WorkloadStats => {
  const todayStart = startOfDay(now);
  const todayEnd = todayStart + DAY_MS;
  let overdue = 0;
  let dueToday = 0;
  const forecast = Array.from({ length: 7 }, (_v, idx) => {
    const dayStart = todayStart + idx * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    let count = 0;
    states.forEach(state => {
      if (state.due >= dayStart && state.due < dayEnd) {
        count += 1;
      }
    });
    return { date: new Date(dayStart).toISOString(), count };
  });
  states.forEach(state => {
    if (state.due < todayStart) {
      overdue += 1;
    }
    if (state.due >= todayStart && state.due < todayEnd) {
      dueToday += 1;
    }
  });

  const dueNext7Days = forecast.reduce((sum, entry) => sum + entry.count, 0);

  return {
    overdue,
    dueToday,
    dueNext7Days,
    forecast,
  };
};

const computeRisk = (
  states: Map<string, SchedulingState>,
  cards: CardTemplate[],
  now: number
): ForgettingRiskStats => {
  const risks: ForgettingRiskCard[] = [];
  let cumulativeRisk = 0;
  cards.forEach(card => {
    const state = states.get(card.id);
    if (!state) {
      return;
    }
    const lastReview = state.lastReview ?? state.due - state.interval * DAY_MS;
    const elapsedMs = Math.max(0, now - lastReview);
    const stabilityMs = Math.max(DAY_MS, state.stability * DAY_MS);
    const retrievability = Math.exp(-elapsedMs / stabilityMs);
    const risk = Math.min(1, Math.max(0, 1 - retrievability));
    cumulativeRisk += risk;
    if (risk >= HIGH_RISK_THRESHOLD) {
      risks.push({
        cardId: card.id,
        front: card.front,
        due: new Date(state.due).toISOString(),
        risk: Number(risk.toFixed(2)),
      });
    }
  });

  const averageRisk = states.size === 0 ? 0 : Number((cumulativeRisk / states.size).toFixed(2));
  const sortedRisks = risks.sort((a, b) => b.risk - a.risk).slice(0, 10);

  return {
    averageRisk,
    highRiskCards: sortedRisks,
  };
};

const computeTagStats = (
  cards: CardTemplate[],
  states: Map<string, SchedulingState>
): TagStatEntry[] => {
  const stats = new Map<string, TagStatEntry>();
  const now = Date.now();
  cards.forEach(card => {
    const tags = card.tags && card.tags.length > 0 ? card.tags : ['untagged'];
    const state = states.get(card.id);
    tags.forEach(tag => {
      if (!stats.has(tag)) {
        stats.set(tag, { tag, total: 0, mastered: 0, due: 0 });
      }
      const entry = stats.get(tag)!;
      entry.total += 1;
      if (state) {
        if (state.interval >= MASTERED_INTERVAL_DAYS) {
          entry.mastered += 1;
        }
        if (state.due <= now) {
          entry.due += 1;
        }
      }
    });
  });
  return Array.from(stats.values()).sort((a, b) => b.total - a.total);
};

const buildDeckAnalytics = async (userId: string, deck: Deck, sessionCounts: Map<string, number>): Promise<DeckAnalytics> => {
  const now = Date.now();
  const states = await SchedulingStateRepository.listDeckStates(userId, deck.id);
  for (const card of deck.cards) {
    if (!states.has(card.id)) {
      const defaultState = ensureState(undefined, now);
      await SchedulingStateRepository.set(userId, deck.id, card.id, defaultState);
      states.set(card.id, defaultState);
    }
  }
  const reviews = await ReviewRepository.list(userId, deck.id);
  const retention = buildRetentionSeries(reviews);
  const mastery = computeMastery(states, deck.cards.length);
  const workload = computeWorkload(states, now);
  const forgetting = computeRisk(states, deck.cards, now);
  const tagBreakdown = computeTagStats(deck.cards, states);

  return {
    deckId: deck.id,
    deckTitle: deck.title,
    retention,
    mastery,
    workload,
    forgetting,
    tagBreakdown,
    lastUpdated: new Date(now).toISOString(),
    sessionCount: sessionCounts.get(deck.id) ?? 0,
  };
};

export const FlashcardAnalytics = {
  async getDeck(userId: string, deckId: string): Promise<DeckAnalytics> {
    const deck = await DeckRepository.get(userId, deckId);
    if (!deck) {
      throw new Error('Deck not found');
    }
    const counts = await SessionCountRepository.getCounts();
    return buildDeckAnalytics(userId, deck, counts);
  },
  async getAll(userId: string): Promise<FlashcardAnalyticsBundle> {
    const decks = await DeckRepository.list(userId);
    if (decks.length === 0) {
      return {
        summary: {
          totalDecks: 0,
          totalCards: 0,
          cardsMastered: 0,
          averageRetention: 0,
          upcomingReviews: 0,
        },
        decks: [],
      };
    }
    const sessionCounts = await SessionCountRepository.getCounts();
    const deckAnalytics = await Promise.all(decks.map(deck => buildDeckAnalytics(userId, deck, sessionCounts)));
    const totalDecks = deckAnalytics.length;
    const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);
    const cardsMastered = deckAnalytics.reduce((sum, stats) => sum + stats.mastery.mastered, 0);
    const retentionValues = deckAnalytics
      .flatMap(deckStat => deckStat.retention.filter(point => point.attempts > 0).map(point => point.successRate))
      .filter(rate => rate >= 0);
    const averageRetention =
      retentionValues.length === 0
        ? 0
        : Number((retentionValues.reduce((acc, rate) => acc + rate, 0) / retentionValues.length).toFixed(1));
    const upcomingReviews = deckAnalytics.reduce((sum, stats) => sum + stats.workload.dueNext7Days, 0);

    return {
      summary: {
        totalDecks,
        totalCards,
        cardsMastered,
        averageRetention,
        upcomingReviews,
      },
      decks: deckAnalytics,
    };
  },
};
