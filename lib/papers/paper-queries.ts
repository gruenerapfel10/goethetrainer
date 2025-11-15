import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import { sanitizeForFirestore } from '@/lib/sessions/utils';
import type { PaperBlueprint } from './types';
import type { SessionType } from '@/lib/sessions/types';

const PAPERS_COLLECTION = 'papers';

export async function savePaperBlueprint(paper: PaperBlueprint): Promise<void> {
  try {
    const payload = sanitizeForFirestore({
      ...paper,
      createdAt: new Date(paper.createdAt),
    });
    await adminDb.collection(PAPERS_COLLECTION).doc(paper.id).set(payload);
  } catch (error) {
    console.error('Error saving paper blueprint:', error);
    throw new Error('Failed to save paper blueprint');
  }
}

export async function loadPaperBlueprint(paperId: string): Promise<PaperBlueprint | null> {
  try {
    const doc = await adminDb.collection(PAPERS_COLLECTION).doc(paperId).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data();
    if (!data) {
      return null;
    }
    return {
      ...(data as PaperBlueprint),
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error loading paper blueprint:', error);
    return null;
  }
}

export async function listPapersByType(type: SessionType, limit = 20): Promise<PaperBlueprint[]> {
  try {
    const snapshot = await adminDb
      .collection(PAPERS_COLLECTION)
      .where('type', '==', type)
      .limit(limit)
      .get();

    const papers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...(data as PaperBlueprint),
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      };
    });
    return papers.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error listing paper blueprints:', error);
    return [];
  }
}
