import 'server-only';

import type { CardDraft } from '@/lib/flashcards/types';
import { adminDb } from '@/lib/firebase/admin';
import { sanitizeForFirestore } from '@/lib/sessions/utils';

const COLLECTION = 'flashcardDrafts';

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const docToDraft = (
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot
): CardDraft => {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    userId: data.userId,
    deckId: data.deckId,
    sourceId: data.sourceId,
    front: data.front,
    back: data.back,
    hint: data.hint,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
  };
};

export const CardDraftRepository = {
  async list(userId: string, deckId: string) {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('deckId', '==', deckId)
      .get();
    const drafts = snapshot.docs.map(docToDraft);
    return drafts
      .filter(draft => draft.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 200);
  },
  async create(userId: string, payload: Omit<CardDraft, 'id' | 'createdAt' | 'userId'>): Promise<CardDraft> {
    const id = generateId();
    const createdAt = new Date();
    const draft: CardDraft = {
      ...payload,
      userId,
      id,
      createdAt: createdAt.toISOString(),
    };
    const cleanPayload = sanitizeForFirestore({
      ...draft,
      createdAt,
    });
    await adminDb.collection(COLLECTION).doc(id).set(cleanPayload);
    return draft;
  },
  async delete(userId: string, draftId: string) {
    const ref = adminDb.collection(COLLECTION).doc(draftId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return;
    }
    if (snapshot.data()?.userId !== userId) {
      throw new Error('Unauthorized');
    }
    await ref.delete();
  },
  async get(userId: string, draftId: string) {
    const snapshot = await adminDb.collection(COLLECTION).doc(draftId).get();
    if (!snapshot.exists || snapshot.data()?.userId !== userId) {
      return null;
    }
    return docToDraft(snapshot);
  },
};
