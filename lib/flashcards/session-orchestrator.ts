import { DeckRepository } from '@/lib/flashcards/repository/supabase-repo';
import { SessionRepository } from '@/lib/flashcards/repository/session-repo';
import { SchedulingStateRepository } from '@/lib/flashcards/repository/state-repo';
import { ReviewRepository } from '@/lib/flashcards/repository/review-repo';
import { SessionFactory } from '@/lib/flashcards/session-factory';
import { getSchedulingStrategy, registerDefaultSchedulingStrategies } from '@/lib/flashcards/scheduler/registry';
import type { Deck, FlashcardSession, ReviewEvent, ScheduledCard, SchedulingState, FeedbackRating } from '@/lib/flashcards/types';
import type { SchedulingStrategy } from '@/lib/flashcards/scheduler/base';

let strategiesRegistered = false;
const ensureStrategies = () => {
  if (!strategiesRegistered) {
    registerDefaultSchedulingStrategies();
    strategiesRegistered = true;
  }
};

const DEFAULT_STRATEGY_ID = 'fsrs-lite';

const buildScheduledQueue = async (userId: string, deck: Deck, strategy: SchedulingStrategy) => {
  const now = Date.now();
  const context = { now };
  const states = await SchedulingStateRepository.listDeckStates(userId, deck.id);
  const queue: ScheduledCard[] = [];
  for (const card of deck.cards) {
    const existing = states.get(card.id);
    if (existing) {
      queue.push({ card, state: existing });
      continue;
    }
    const state = strategy.getInitialState(card, context);
    await SchedulingStateRepository.set(userId, deck.id, card.id, state);
    queue.push({ card, state });
  }
  return queue.sort((a, b) => a.state.due - b.state.due);
};

export const FlashcardSessionOrchestrator = {
  async startSession(userId: string, deckId: string, mode: 'finite' | 'infinite') {
    ensureStrategies();
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
    const session = SessionFactory.create(userId, deck, queue, strategyId, mode);
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
  async answerCard(userId: string, sessionId: string, feedback: FeedbackRating) {
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
    const now = Date.now();
    const context = { now };
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
      feedback,
      prevInterval: session.activeCard.state.interval,
      nextInterval: nextState.interval,
    };

    try {
      await ReviewRepository.append(reviewEvent);
    } catch (error) {
      console.error('Failed to append flashcard review', error);
    }

    const [next, ...rest] = session.remainingQueue;
    if (!next && session.deckMode === 'infinite') {
      const states = await SchedulingStateRepository.listDeckStates(userId, session.deckId);
      const cardState = states.get(session.activeCard.card.id) ?? nextState;
      const looped: ScheduledCard = {
        card: session.activeCard.card,
        state: cardState,
      };
      rest.push(looped);
    }
    const updated: FlashcardSession = {
      ...session,
      activeCard: next ?? null,
      remainingQueue: rest,
      completed: [...session.completed, reviewEvent],
    };
    await SessionRepository.update(updated);
    return updated;
  },
};
