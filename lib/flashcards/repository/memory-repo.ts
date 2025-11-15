import 'server-only';

import type {
  CardTemplate,
  Deck,
  FeedbackRating,
  FlashcardSession,
  ReviewEvent,
  ScheduledCard,
  SchedulingState,
} from '@/lib/flashcards/types';
import { FlashcardDeckType } from '@/lib/flashcards/types';
import { FlashcardEventLog } from '@/lib/flashcards/logs/event-log';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sanitizeForFirestore } from '@/lib/sessions/utils';

const DECKS_COLLECTION = 'flashcardDecks';
const SESSIONS_COLLECTION = 'flashcardSessions';
const SCHEDULING_COLLECTION = 'flashcardSchedulingStates';
const REVIEWS_COLLECTION = 'flashcardReviewEvents';

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const timestampToISO = (value: any) =>
  value?.toDate?.()?.toISOString?.() ?? new Date().toISOString();

const normalizeCard = (cardLike: any): CardTemplate => ({
  id: cardLike.id ?? generateId(),
  type: cardLike.type ?? FlashcardDeckType.BASIC,
  front: cardLike.front ?? '',
  back: cardLike.back ?? '',
  hint: cardLike.hint,
  tags: Array.isArray(cardLike.tags) ? cardLike.tags : [],
});

const deckDocToModel = (doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Deck => {
  const data = doc.data() ?? {};
  const cards: CardTemplate[] = Array.isArray((data as any).cards)
    ? (data as any).cards.map(normalizeCard)
    : [];

  return {
    id: doc.id,
    userId: (data as any).userId,
    title: (data as any).title ?? 'Untitled deck',
    description: (data as any).description,
    cards,
    categories: Array.isArray((data as any).categories)
      ? (data as any).categories.map((item: unknown) => String(item))
      : [],
    createdAt: timestampToISO((data as any).createdAt),
    status: (data as any).status ?? 'draft',
    settings: (data as any).settings ?? {
      schedulerId: 'fsrs-lite',
      feedbackPolicyId: 'ternary',
    },
  };
};

const ensureDeckOwnership = (deck: FirebaseFirestore.DocumentSnapshot, userId: string) => {
  const data = deck.data();
  if (!data || data.userId !== userId) {
    throw new Error('Deck not found');
  }
};

export const DeckRepository = {
  async list(userId: string, status?: Deck['status']): Promise<Deck[]> {
    const query = adminDb.collection(DECKS_COLLECTION).where('userId', '==', userId);
    const snapshot = await query.get();
    const decks = snapshot.docs.map(deckDocToModel);
    decks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!status) {
      return decks;
    }
    return decks.filter(deck => deck.status === status);
  },
  async get(userId: string, deckId: string): Promise<Deck | null> {
    const docRef = adminDb.collection(DECKS_COLLECTION).doc(deckId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return null;
    }
    ensureDeckOwnership(snapshot, userId);
    return deckDocToModel(snapshot);
  },
  async create(
    userId: string,
    payload: {
      title: string;
      description?: string;
      categories?: string[];
      cards?: Omit<CardTemplate, 'id'>[];
    }
  ): Promise<Deck> {
    const now = new Date();
    const deckId = adminDb.collection(DECKS_COLLECTION).doc().id;
    const normalizedCards = Array.isArray(payload.cards)
      ? payload.cards.map(normalizeCard)
      : [];
    const normalizedCategories = Array.isArray(payload.categories)
      ? Array.from(new Set(payload.categories.map(name => name.trim()).filter(Boolean)))
      : [];
    const deck: Deck = {
      id: deckId,
      userId,
      title: payload.title,
      description: payload.description,
      cards: normalizedCards,
      categories: normalizedCategories,
      createdAt: now.toISOString(),
      status: 'draft',
      settings: {
        schedulerId: 'fsrs-lite',
        feedbackPolicyId: 'ternary',
      },
    };

    const docPayload = sanitizeForFirestore({
      ...deck,
      createdAt: now,
    });

    await adminDb.collection(DECKS_COLLECTION).doc(deckId).set(docPayload);
    return deck;
  },
  async addCard(
    userId: string,
    deckId: string,
    card: Omit<CardTemplate, 'id'>
  ): Promise<Deck> {
    const docRef = adminDb.collection(DECKS_COLLECTION).doc(deckId);
    const cardId = generateId();

    await adminDb.runTransaction(async tx => {
      const snapshot = await tx.get(docRef);
      if (!snapshot.exists) {
        throw new Error('Deck not found');
      }
      ensureDeckOwnership(snapshot, userId);

      const data = snapshot.data() ?? {};
      const cards: CardTemplate[] = Array.isArray(data.cards) ? data.cards : [];
      const newCard: CardTemplate = {
        id: cardId,
        type: card.type ?? FlashcardDeckType.BASIC,
        front: card.front,
        back: card.back,
        hint: card.hint,
        tags: card.tags ?? [],
      };
      cards.push(newCard);
      tx.update(docRef, {
        cards,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    const updated = await docRef.get();
    FlashcardEventLog.append({
      type: 'card_added',
      payload: { deckId, cardId },
      timestamp: Date.now(),
    });
    return deckDocToModel(updated);
  },
  async publish(userId: string, deckId: string): Promise<Deck> {
    const docRef = adminDb.collection(DECKS_COLLECTION).doc(deckId);
    await adminDb.runTransaction(async tx => {
      const snapshot = await tx.get(docRef);
      if (!snapshot.exists) {
        throw new Error('Deck not found');
      }
      ensureDeckOwnership(snapshot, userId);
      tx.update(docRef, {
        status: 'published',
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    const updated = await docRef.get();
    return deckDocToModel(updated);
  },
  async updateSettings(
    userId: string,
    deckId: string,
    settings: Partial<Deck['settings']>
  ): Promise<Deck> {
    const docRef = adminDb.collection(DECKS_COLLECTION).doc(deckId);
    await adminDb.runTransaction(async tx => {
      const snapshot = await tx.get(docRef);
      if (!snapshot.exists) {
        throw new Error('Deck not found');
      }
      ensureDeckOwnership(snapshot, userId);
      const data = snapshot.data() ?? {};
      const nextSettings = {
        ...(data.settings ?? {}),
        ...settings,
      };
      tx.update(docRef, {
        settings: nextSettings,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    const updated = await docRef.get();
    return deckDocToModel(updated);
  },
};

const sessionDocToModel = (
  doc: FirebaseFirestore.DocumentSnapshot
): FlashcardSession => {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    deckId: data.deckId,
    userId: data.userId,
    activeCard: data.activeCard ?? null,
    remainingQueue: data.remainingQueue ?? [],
    completed: data.completed ?? [],
    schedulerId: data.schedulerId ?? 'fsrs-lite',
  };
};

export const SessionRepository = {
  async create(session: FlashcardSession) {
    const payload = sanitizeForFirestore({
      ...session,
      createdAt: new Date(),
    });
    await adminDb.collection(SESSIONS_COLLECTION).doc(session.id).set(payload);
  },
  async get(userId: string, sessionId: string) {
    const snapshot = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    if (!snapshot.exists) {
      return null;
    }
    if ((snapshot.data()?.userId ?? userId) !== userId) {
      return null;
    }
    return sessionDocToModel(snapshot);
  },
  async update(session: FlashcardSession) {
    const payload = sanitizeForFirestore({
      ...session,
      updatedAt: new Date(),
    });
    await adminDb.collection(SESSIONS_COLLECTION).doc(session.id).set(payload);
  },
};

export const SchedulingStateRepository = {
  async get(userId: string, deckId: string, cardId: string) {
    const snapshot = await adminDb
      .collection(SCHEDULING_COLLECTION)
      .doc(`${userId}_${deckId}_${cardId}`)
      .get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() as SchedulingState;
  },
  async set(userId: string, deckId: string, cardId: string, state: SchedulingState) {
    await adminDb
      .collection(SCHEDULING_COLLECTION)
      .doc(`${userId}_${deckId}_${cardId}`)
      .set({
        userId,
        deckId,
        cardId,
        ...state,
        updatedAt: FieldValue.serverTimestamp(),
      });
  },
  async listDeckStates(userId: string, deckId: string) {
    const snapshot = await adminDb
      .collection(SCHEDULING_COLLECTION)
      .where('userId', '==', userId)
      .where('deckId', '==', deckId)
      .get();
    const states = new Map<string, SchedulingState>();
    snapshot.forEach(doc => {
      const data = doc.data();
      states.set(data.cardId, {
        due: data.due,
        interval: data.interval,
        easeFactor: data.easeFactor,
        stability: data.stability,
        difficulty: data.difficulty,
      });
    });
    return states;
  },
};

export const ReviewRepository = {
  async append(event: ReviewEvent) {
    await adminDb.collection(REVIEWS_COLLECTION).add({
      ...event,
      createdAt: FieldValue.serverTimestamp(),
    });
  },
  async list(userId: string, deckId: string) {
    const snapshot = await adminDb
      .collection(REVIEWS_COLLECTION)
      .where('deckId', '==', deckId)
      .get();
    return snapshot
      .docs.map(doc => doc.data() as ReviewEvent)
      .filter(event => event.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 500);
  },
};

export const SessionFactory = {
  create(userId: string, deck: Deck, scheduledCards: ScheduledCard[], schedulerId: string): FlashcardSession {
    const [first, ...rest] = scheduledCards;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    return {
      id,
      deckId: deck.id,
      userId,
      activeCard: first ?? null,
      remainingQueue: rest,
      completed: [],
      schedulerId,
    };
  },
};
