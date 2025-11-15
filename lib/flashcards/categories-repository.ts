import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import { sanitizeForFirestore } from '@/lib/sessions/utils';
import type { DeckCategory } from '@/lib/flashcards/types';

const COLLECTION = 'flashcardCategories';

const docToCategory = (
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot
): DeckCategory => {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    userId: data.userId,
    name: data.name ?? 'Uncategorized',
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
  };
};

export const CategoryRepository = {
  async list(userId: string): Promise<DeckCategory[]> {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(docToCategory);
  },
  async create(userId: string, name: string): Promise<DeckCategory> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Category name is required');
    }
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .get();
    const existingDoc = snapshot.docs.find(doc => (doc.data()?.name ?? '') === trimmed);
    if (existingDoc) {
      return docToCategory(existingDoc);
    }
    const categoryId = adminDb.collection(COLLECTION).doc().id;
    const createdAt = new Date();
    const category: DeckCategory = {
      id: categoryId,
      userId,
      name: trimmed,
      createdAt: createdAt.toISOString(),
    };
    const payload = sanitizeForFirestore({
      ...category,
      createdAt,
    });
    await adminDb.collection(COLLECTION).doc(categoryId).set(payload);
    return category;
  },
};
