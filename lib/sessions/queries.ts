import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type {
  Session,
  SessionStats,
  SessionAnalytics,
  SessionType,
} from './types';
import { sanitizeForFirestore } from './utils';

const SESSION_TYPES: SessionType[] = ['reading', 'listening', 'writing', 'speaking'];

const createEmptyAnalytics = (): SessionAnalytics =>
  SESSION_TYPES.reduce((acc, type) => {
    acc[type] = {
      count: 0,
      totalDuration: 0,
      averageDuration: 0,
      completionRate: 0,
    };
    return acc;
  }, {} as SessionAnalytics);

const SESSIONS_COLLECTION = 'sessions';

// Save a new session
export async function saveSession(session: Session): Promise<void> {
  try {
    const cleanedSession = sanitizeForFirestore({
      ...session,
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? null,
      updatedAt: new Date(),
    });

    await adminDb.collection(SESSIONS_COLLECTION).doc(session.id).set(cleanedSession);
  } catch (error) {
    console.error('Error saving session:', error);
    throw new Error('Failed to save session');
  }
}

// Get session by ID
export async function getSessionById(sessionId: string): Promise<Session | null> {
  try {
    const doc = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    const session = {
      ...data,
      startedAt: data?.startedAt?.toDate() || new Date(),
      endedAt: data?.endedAt?.toDate() || undefined
    } as Session;

    console.log('[sessions][queries][getSessionById]', sessionId, {
      type: session.type,
      status: session.status,
      questions: session.data?.questions?.length ?? 0,
      results: session.data?.results?.length ?? 0,
    });
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Update existing session
export async function updateSession(session: Session): Promise<void> {
  try {
    const cleanedSession = sanitizeForFirestore({
      ...session,
      updatedAt: new Date(),
    });

    await adminDb.collection(SESSIONS_COLLECTION).doc(session.id).update(cleanedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    throw new Error('Failed to update session');
  }
}

// Get user's sessions by type
export async function getUserSessions(
  userId: string,
  type?: SessionType,
  limit: number = 20
): Promise<Session[]> {
  try {
    const results: Session[] = [];
    let cursor: QueryDocumentSnapshot | undefined;
    const pageSize = 50; // Fetch in batches

    // If limit is explicitly set to a small number, respect it. Otherwise fetch all.
    const shouldFetchAll = limit >= 20; // Default behavior is to fetch all

    while (true) {
      let query = adminDb
        .collection(SESSIONS_COLLECTION)
        .where('userId', '==', userId)
        .orderBy('startedAt', 'desc');

      if (cursor) {
        query = query.startAfter(cursor);
      }

      const snapshot = await query.limit(pageSize).get();
      if (snapshot.empty) {
        break;
      }

      const page = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          startedAt: data.startedAt?.toDate() || new Date(),
          endedAt: data.endedAt?.toDate() || undefined,
        } as Session;
      });

      for (const session of page) {
        if (type && session.type !== type) {
          continue;
        }
        results.push(session);
      }

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (!lastDoc || snapshot.size < pageSize) {
        break;
      }
      cursor = lastDoc;
    }

    console.log('[sessions][queries][getUserSessions]', {
      userId,
      type,
      requested: limit,
      returned: results.length,
      first: results[0]?.id,
      firstResults: results[0]?.data?.results?.length ?? 0,
    });

    return results;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}

// Get user's active sessions
export async function getActiveSessions(userId: string): Promise<Session[]> {
  try {
    // Simplified query to avoid index requirement
    const snapshot = await adminDb.collection(SESSIONS_COLLECTION)
      .where('userId', '==', userId)
      .get();

    // Filter active sessions in memory
    const sessions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        startedAt: data.startedAt?.toDate() || new Date(),
        endedAt: data.endedAt?.toDate() || undefined
      } as Session;
    });

    // Filter for active/paused sessions and sort by startedAt
    return sessions
      .filter(s => s.status === 'active' || s.status === 'paused')
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  } catch (error) {
    console.error('Error getting active sessions:', error);
    return [];
  }
}

// Get user session statistics
export async function getUserSessionStats(userId: string): Promise<SessionStats> {
  try {
    const snapshot = await adminDb.collection(SESSIONS_COLLECTION)
      .where('userId', '==', userId)
      .get();

    const sessions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        startedAt: data.startedAt?.toDate() || new Date(),
        endedAt: data.endedAt?.toDate() || undefined
      } as Session;
    });

    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    
    // Calculate streak
    const sortedSessions = sessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    
    let streakDays = 0;
    if (sortedSessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let currentDate = new Date(sortedSessions[0].startedAt);
      currentDate.setHours(0, 0, 0, 0);
      
      // Check if there was a session today or yesterday
      const dayDiff = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff <= 1) {
        streakDays = 1;
        
        // Count consecutive days
        for (let i = 1; i < sortedSessions.length; i++) {
          const sessionDate = new Date(sortedSessions[i].startedAt);
          sessionDate.setHours(0, 0, 0, 0);
          
          const diff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diff <= 1) {
            if (diff === 1) {
              streakDays++;
              currentDate = sessionDate;
            }
          } else {
            break;
          }
        }
      }
    }

    // Get last session date from all sessions, not just completed
    const lastSession = sessions.length > 0 
      ? sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]
      : null;

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      totalDuration,
      averageDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
      lastSessionDate: lastSession ? lastSession.startedAt : undefined,
      streakDays
    };
  } catch (error) {
    console.error('Error getting session stats:', error);
    return {
      totalSessions: 0,
      completedSessions: 0,
      totalDuration: 0,
      averageDuration: 0,
      streakDays: 0
    };
  }
}

// Get session analytics by type
export async function getSessionAnalytics(
  userId: string, 
  days: number = 30
): Promise<SessionAnalytics> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshot = await adminDb.collection(SESSIONS_COLLECTION)
      .where('userId', '==', userId)
      .where('startedAt', '>=', startDate)
      .get();

    const sessions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        startedAt: data.startedAt?.toDate() || new Date(),
        endedAt: data.endedAt?.toDate() || undefined
      } as Session;
    });

    const analytics: SessionAnalytics = createEmptyAnalytics();

    for (const type of SESSION_TYPES) {
      const typeSessions = sessions.filter(s => s.type === type);
      const completed = typeSessions.filter(s => s.status === 'completed');
      const totalDuration = typeSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

      analytics[type] = {
        count: typeSessions.length,
        totalDuration,
        averageDuration: typeSessions.length > 0 ? Math.round(totalDuration / typeSessions.length) : 0,
        completionRate: typeSessions.length > 0 ? (completed.length / typeSessions.length) * 100 : 0
      };
    }

    return analytics;
  } catch (error) {
    console.error('Error getting session analytics:', error);
    return createEmptyAnalytics();
  }
}

// Delete session
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).delete();
  } catch (error) {
    console.error('Error deleting session:', error);
    throw new Error('Failed to delete session');
  }
}

// Get sessions within date range
export async function getSessionsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Session[]> {
  try {
    // Simplified query to avoid index requirement
    const snapshot = await adminDb.collection(SESSIONS_COLLECTION)
      .where('userId', '==', userId)
      .get();

    // Filter and sort in memory
    const sessions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        startedAt: data.startedAt?.toDate() || new Date(),
        endedAt: data.endedAt?.toDate() || undefined
      } as Session;
    });

    // Filter by date range and sort
    return sessions
      .filter(s => s.startedAt >= startDate && s.startedAt <= endDate)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  } catch (error) {
    console.error('Error getting sessions by date range:', error);
    return [];
  }
}
