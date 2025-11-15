import 'server-only';

import type { SourceDocument } from '@/lib/flashcards/types';
import { FlashcardEventLog } from '@/lib/flashcards/logs/event-log';
import { adminDb } from '@/lib/firebase/admin';
import { sanitizeForFirestore } from '@/lib/sessions/utils';

const COLLECTION = 'flashcardSources';

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const docToSource = (doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): SourceDocument => {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    userId: data.userId,
    title: data.title ?? 'Untitled source',
    content: data.content ?? '',
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    origin: data.origin ?? { type: 'manual' },
  };
};

export const SourceRepository = {
  async list(userId: string): Promise<SourceDocument[]> {
    const snapshot = await adminDb.collection(COLLECTION).where('userId', '==', userId).get();
    return snapshot
      .docs.map(docToSource)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 200);
  },
  async get(userId: string, id: string): Promise<SourceDocument | null> {
    const snapshot = await adminDb.collection(COLLECTION).doc(id).get();
    if (!snapshot.exists) {
      return null;
    }
    if (snapshot.data()?.userId !== userId) {
      return null;
    }
    return docToSource(snapshot);
  },
  async createFromText(
    userId: string,
    payload: { title: string; content: string; origin?: SourceDocument['origin'] }
  ) {
    const id = adminDb.collection(COLLECTION).doc().id ?? generateId();
    const createdAt = new Date();
    const doc: SourceDocument = {
      id,
      userId,
      title: payload.title.trim() || 'Untitled source',
      content: payload.content,
      createdAt: createdAt.toISOString(),
      origin: payload.origin ?? { type: 'manual' },
    };
    const cleanPayload = sanitizeForFirestore({
      ...doc,
      createdAt,
    });
    await adminDb.collection(COLLECTION).doc(id).set(cleanPayload);
    FlashcardEventLog.append({
      type: 'source_created',
      payload: { id, origin: doc.origin.type },
      timestamp: Date.now(),
    });
    return doc;
  },
  async createFromUrl(userId: string, url: string, title?: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    const content = await response.text();
    return this.createFromText(userId, {
      title: title ?? url,
      content,
      origin: { type: 'url', reference: url },
    });
  },
};
