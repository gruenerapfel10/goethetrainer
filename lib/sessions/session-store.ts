import type { Session } from './types';
import { sanitizeForFirestore } from './utils';
import { getSessionById, saveSession, updateSession as updateSessionDocument } from './queries';
import { ensureStandardSessionData } from './session-blueprint';

export function touchSession(session: Session): void {
  if (!session.metadata) {
    session.metadata = {};
  }
  session.metadata.lastUpdatedAt = new Date().toISOString();
}

export function ensureSessionCollections(session: Session): void {
  session.data = ensureStandardSessionData(session.data) as Session['data'];
}

export function sanitizeSession(session: Session): Session {
  ensureSessionCollections(session);

  const normalised: Session = {
    ...session,
    startedAt: session.startedAt ?? new Date(),
    endedAt: session.endedAt ?? null,
  };

  return sanitizeForFirestore(normalised) as Session;
}

export async function persistSession(session: Session): Promise<Session> {
  const sanitized = sanitizeSession(session);
  await updateSessionDocument(sanitized);
  return sanitized;
}

export async function saveSessionRecord(session: Session): Promise<void> {
  const sanitized = sanitizeSession(session);
  await saveSession(sanitized);
}

export function assertOwnership(session: Session, userId: string): void {
  if (session.userId !== userId) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 403 });
  }
}

export async function requireSession(sessionId: string): Promise<Session> {
  const session = await getSessionById(sessionId);
  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }
  ensureSessionCollections(session);
  return session;
}

export async function loadSessionForUser(sessionId: string, userId: string): Promise<Session> {
  const session = await requireSession(sessionId);
  assertOwnership(session, userId);
  return session;
}
