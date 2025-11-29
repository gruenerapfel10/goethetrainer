import type { DeckAnalytics, FlashcardAnalyticsBundle } from '@/lib/flashcards/analytics/types';

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const daysSince = (isoDate: string | null, now: number) => {
  if (!isoDate) return Number.POSITIVE_INFINITY;
  const delta = now - new Date(isoDate).getTime();
  return Math.max(0, Math.round(delta / DAY_MS));
};

const lastReviewedDaysAgo = (deck: DeckAnalytics, now: number) => {
  const lastAttempt = [...deck.retention].reverse().find(point => point.attempts > 0);
  return daysSince(lastAttempt?.date ?? null, now);
};

export type DeckReminder = {
  deckId: string;
  deckTitle: string;
  priority: number;
  overdue: number;
  dueToday: number;
  dueNext7Days: number;
  averageRisk: number;
  mastery: number;
  daysSinceLastReview: number;
  totalCards: number;
  status: 'struggling' | 'good' | 'mastered';
  statusReason: string;
  statusCounts: {
    struggling: number;
    good: number;
    mastered: number;
  };
};

const scoreDeck = (deck: DeckAnalytics, now: number): DeckReminder => {
  const inactivityDays = lastReviewedDaysAgo(deck, now);
  const inactivityScore = inactivityDays === Number.POSITIVE_INFINITY ? 1 : clamp01(inactivityDays / 21);

  const overdueShare = deck.mastery.total > 0 ? deck.workload.overdue / deck.mastery.total : deck.workload.overdue > 0 ? 1 : 0;
  const dueSoonScore = deck.mastery.total > 0 ? clamp01(deck.workload.dueNext7Days / deck.mastery.total) : clamp01(deck.workload.dueNext7Days / 10);
  const riskScore = clamp01(deck.forgetting.averageRisk);
  const masteryGap = clamp01(1 - deck.mastery.percentage / 100);

  const overdueTotal = deck.workload.overdue;
  const overdueRatio = deck.mastery.total > 0 ? overdueTotal / deck.mastery.total : 0;
  const struggling =
    riskScore >= 0.5 ||
    overdueTotal > 0 ||
    overdueRatio >= 0.2 ||
    inactivityDays >= 14;
  const mastered =
    deck.mastery.percentage >= 80 && riskScore < 0.25 && overdueTotal <= 1 && inactivityDays < 45;

  let status: DeckReminder['status'] = 'good';
  let statusReason = 'Stable: keep pace.';
  if (struggling) {
    status = 'struggling';
    const reasons = [];
    if (overdueTotal > 0) reasons.push(`overdue ${overdueTotal}`);
    if (riskScore >= 0.5) reasons.push(`risk ${Math.round(riskScore * 100)}%`);
    if (inactivityDays >= 14) reasons.push(`${inactivityDays}d idle`);
    statusReason = `Struggling: ${reasons.join(', ')}`;
  } else if (mastered) {
    status = 'mastered';
    statusReason = 'Mastered: low risk and high mastery.';
  }

  const totalCards = deck.mastery.total;
  const masteredCount = deck.mastery.mastered;
  const highRiskCount = deck.forgetting.highRiskCards?.length ?? 0;
  const strugglingEstimate = Math.max(overdueTotal + deck.workload.dueToday, highRiskCount);
  const strugglingFromRisk = Math.round(totalCards * riskScore);
  const strugglingCount = Math.min(
    totalCards - masteredCount,
    Math.max(strugglingEstimate, strugglingFromRisk)
  );
  const goodCount = Math.max(totalCards - masteredCount - strugglingCount, 0);

  const priority =
    0.28 * overdueShare +
    0.24 * inactivityScore +
    0.18 * riskScore +
    0.16 * dueSoonScore +
    0.14 * masteryGap;

  return {
    deckId: deck.deckId,
    deckTitle: deck.deckTitle,
    priority: Number(priority.toFixed(4)),
    overdue: deck.workload.overdue,
    dueToday: deck.workload.dueToday,
    dueNext7Days: deck.workload.dueNext7Days,
    averageRisk: deck.forgetting.averageRisk,
    mastery: deck.mastery.percentage,
    daysSinceLastReview: inactivityDays === Number.POSITIVE_INFINITY ? 90 : inactivityDays,
    totalCards,
    status,
    statusReason,
    statusCounts: {
      struggling: strugglingCount,
      good: goodCount,
      mastered: masteredCount,
    },
  };
};

export const ReminderAlgorithm = {
  /**
   * Returns decks sorted by urgency so we can nudge users toward neglected / risky decks first.
   * Scoring combines: overdue share, inactivity, forgetting risk, near-term workload, mastery gap, and recent accuracy.
   */
  buildPriorityList(analytics: FlashcardAnalyticsBundle | null | undefined, now: number = Date.now()): DeckReminder[] {
    if (!analytics?.decks?.length) return [];
    return analytics.decks.map(deck => scoreDeck(deck, now)).sort((a, b) => b.priority - a.priority);
  },
};
