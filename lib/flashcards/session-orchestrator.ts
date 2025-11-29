import { DeckRepository } from '@/lib/flashcards/repository/supabase-repo';
import { SessionRepository } from '@/lib/flashcards/repository/session-repo';
import { SchedulingStateRepository } from '@/lib/flashcards/repository/state-repo';
import { ReviewRepository } from '@/lib/flashcards/repository/review-repo';
import { SessionFactory } from '@/lib/flashcards/session-factory';
import { getSchedulingStrategy, registerDefaultSchedulingStrategies } from '@/lib/flashcards/scheduler/registry';
import type { Deck, FlashcardSession, ReviewEvent, ScheduledCard, SchedulingState, FeedbackRating } from '@/lib/flashcards/types';
import { FlashcardAlgorithm } from '@/lib/flashcards/types';
import type { SchedulingStrategy } from '@/lib/flashcards/scheduler/base';
import { registerDefaultAlgorithms, getAlgorithm } from '@/lib/flashcards/algorithm/registry';
import type { FlashcardAlgorithmImpl } from '@/lib/flashcards/algorithm/base';

let strategiesRegistered = false;
const ensureStrategies = () => {
  if (!strategiesRegistered) {
    registerDefaultSchedulingStrategies();
    strategiesRegistered = true;
  }
};

let algorithmsRegistered = false;
const ensureAlgorithms = () => {
  if (!algorithmsRegistered) {
    registerDefaultAlgorithms();
    algorithmsRegistered = true;
  }
};

const DEFAULT_STRATEGY_ID = 'fsrs-lite';

const buildScheduledQueue = async (
  userId: string,
  deck: Deck,
  strategy: SchedulingStrategy
) => {
  const now = Date.now();
  const context = { now };
  const states = await SchedulingStateRepository.listDeckStates(userId, deck.id);
  const queue: ScheduledCard[] = [];
  const sourceCards = deck.cards;
  for (const card of sourceCards) {
    const existing = states.get(card.id);
    if (existing) {
      const needsHydration =
        existing.lastReview === undefined || existing.reps === undefined || existing.lapses === undefined;
      const hydrated: SchedulingState = needsHydration
        ? {
            ...existing,
            lastReview: existing.lastReview ?? undefined,
            reps: existing.reps ?? 0,
            lapses: existing.lapses ?? 0,
          }
        : existing;
      if (needsHydration) {
        await SchedulingStateRepository.set(userId, deck.id, card.id, hydrated);
      }
      queue.push({ card, state: hydrated });
      continue;
    }
    const state = strategy.getInitialState(card, context);
    await SchedulingStateRepository.set(userId, deck.id, card.id, state);
    queue.push({ card, state });
  }
  return queue;
};

export const FlashcardSessionOrchestrator = {
  async startSession(
    userId: string,
    deckId: string,
    mode: 'finite' | 'infinite',
    algorithm: FlashcardAlgorithm = FlashcardAlgorithm.FAUST
  ) {
    ensureStrategies();
    ensureAlgorithms();
    const deck = await DeckRepository.get(userId, deckId);
    if (!deck) throw new Error('Deck not found');
    const strategyId = deck.settings?.schedulerId || DEFAULT_STRATEGY_ID;
    const strategy = (() => {
      try {
        return getSchedulingStrategy(strategyId);
      } catch {
        return getSchedulingStrategy(DEFAULT_STRATEGY_ID);
      }
    })();
    const queue = await buildScheduledQueue(userId, deck, strategy);
    const algoImpl: FlashcardAlgorithmImpl = (() => {
      try {
        return getAlgorithm(algorithm);
      } catch {
        return getAlgorithm(FlashcardAlgorithm.FAUST);
      }
    })();
    const { active, remaining } = algoImpl.initialize(queue, mode);
    const session = SessionFactory.create(
      userId,
      deck,
      active ? [active, ...remaining] : remaining,
      strategyId,
      mode,
      algorithm
    );
    // normalize session active/rem queue to match algorithm output
    session.activeCard = active ?? null;
    session.remainingQueue = remaining;
    await SessionRepository.create(session);
    return session;
  },
  async getSession(userId: string, sessionId: string) {
    const session = await SessionRepository.get(userId, sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  },
  async answerCard(
    userId: string,
    sessionId: string,
    feedback: FeedbackRating,
    meta?: {
      shownAt?: number | null;
      answeredAt?: number | null;
      dueAt?: number | null;
      responseMs?: number | null;
      flags?: { revealedEarly?: boolean; usedHint?: boolean };
    }
  ) {
    ensureStrategies();
    const session = await this.getSession(userId, sessionId);
    if (!session.activeCard) {
      return session;
    }
    const strategyId = session.schedulerId || DEFAULT_STRATEGY_ID;
    const strategy = (() => {
      try {
        return getSchedulingStrategy(strategyId);
      } catch {
        return getSchedulingStrategy(DEFAULT_STRATEGY_ID);
      }
    })();
    ensureAlgorithms();
    const algoImpl = (() => {
      try {
        return getAlgorithm(session.algorithm ?? FlashcardAlgorithm.FAUST);
      } catch {
        return getAlgorithm(FlashcardAlgorithm.FAUST);
      }
    })();
    const now = Date.now();
    const context = {
      now,
      shownAt: meta?.shownAt ?? undefined,
      answeredAt: meta?.answeredAt ?? undefined,
      dueAt: meta?.dueAt ?? undefined,
      responseMs: meta?.responseMs ?? undefined,
      lastReview: session.activeCard.state.lastReview,
    };
    const nextState = strategy.scheduleNext(
      session.activeCard.card,
      session.activeCard.state,
      feedback,
      context
    );

    try {
      await SchedulingStateRepository.set(userId, session.deckId, session.activeCard.card.id, nextState);
    } catch (error) {
      console.error('Failed to persist flashcard scheduling state', error);
    }

    const reviewEvent: ReviewEvent = {
      cardId: session.activeCard.card.id,
      deckId: session.deckId,
      userId,
      timestamp: now,
      shownAt: meta?.shownAt ?? undefined,
      answeredAt: meta?.answeredAt ?? now,
      dueAt: meta?.dueAt ?? session.activeCard.state.due ?? undefined,
      responseMs: meta?.responseMs ?? (meta?.answeredAt && meta?.shownAt ? meta.answeredAt - meta.shownAt : undefined),
      flags: meta?.flags,
      feedback,
      prevInterval: session.activeCard.state.interval,
      nextInterval: nextState.interval,
    };

    try {
      await ReviewRepository.append(reviewEvent);
    } catch (error) {
      console.error('Failed to append flashcard review', error);
    }

    const updatedActive: ScheduledCard = { card: session.activeCard.card, state: nextState };
    const { activeCard: nextCard, remainingQueue } = (() => {
      const res = algoImpl.next(session, updatedActive, session.deckMode ?? 'finite', feedback);
      return { activeCard: res.active, remainingQueue: res.remaining };
    })();
    const updated: FlashcardSession = {
      ...session,
      activeCard: nextCard ?? null,
      remainingQueue,
      completed: [...session.completed, reviewEvent],
    };
    await SessionRepository.update(updated);
    return updated;
  },
};
