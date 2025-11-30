import type { AnswerEnvelope } from './adapter-registry';

const CACHE_VERSION = 'v1';

interface CacheSnapshot {
  answers: Record<string, AnswerEnvelope>;
  metadata: {
    activeQuestionId?: string | null;
    activeTeil?: number | null;
    activeView?: 'fragen' | 'quelle' | 'overview' | null;
  };
  savedAt: number;
}

function getKey(sessionId: string) {
  return `session-cache:${sessionId}:${CACHE_VERSION}`;
}

export function loadCache(sessionId: string): CacheSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheSnapshot;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistCache(sessionId: string, snapshot: CacheSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getKey(sessionId), JSON.stringify(snapshot));
  } catch (error) {
    console.warn('Failed to persist local session cache', error);
  }
}

export function clearCache(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getKey(sessionId));
  } catch {
    // ignore
  }
}
