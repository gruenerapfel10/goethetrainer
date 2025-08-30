import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';
import { User } from 'firebase/auth';

export type ExerciseType = 'reading' | 'writing' | 'listening' | 'speaking';
export type SessionStatus = 'in-progress' | 'completed' | 'abandoned';

export interface ExerciseAnswer {
  questionId: string;
  answer: string;
  timeTaken?: number; // seconds
}

export interface ExerciseSession {
  id: string;
  userId: string;
  exerciseType: ExerciseType;
  exerciseTitle: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  answers: ExerciseAnswer[];
  score?: number;
  totalQuestions: number;
  timeSpent: number; // total seconds
  status: SessionStatus;
  metadata?: {
    level?: string;
    difficulty?: string;
    tags?: string[];
  };
}

class SessionService {
  /**
   * Start a new exercise session
   */
  async startSession(
    user: User,
    exerciseType: ExerciseType,
    exerciseTitle: string,
    totalQuestions: number,
    metadata?: ExerciseSession['metadata']
  ): Promise<string> {
    if (!user?.uid) {
      throw new Error('User must be authenticated to start a session');
    }

    const sessionId = `${user.uid}_${exerciseType}_${Date.now()}`;
    const sessionData: Omit<ExerciseSession, 'id'> = {
      userId: user.uid,
      exerciseType,
      exerciseTitle,
      startedAt: serverTimestamp() as Timestamp,
      answers: [],
      totalQuestions,
      timeSpent: 0,
      status: 'in-progress',
      metadata
    };

    try {
      const sessionRef = doc(db, 'exercise-sessions', sessionId);
      await setDoc(sessionRef, sessionData);
      console.log('[SessionService] Started session:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('[SessionService] Error starting session:', error);
      throw new Error('Failed to start exercise session');
    }
  }

  /**
   * Update session with new answer
   */
  async updateAnswer(
    sessionId: string,
    questionId: string,
    answer: string,
    timeTaken?: number
  ): Promise<void> {
    try {
      const sessionRef = doc(db, 'exercise-sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (!sessionSnap.exists()) {
        throw new Error('Session not found');
      }

      const currentSession = sessionSnap.data() as ExerciseSession;
      const updatedAnswers = [...currentSession.answers];
      
      // Find existing answer or add new one
      const existingIndex = updatedAnswers.findIndex(a => a.questionId === questionId);
      const newAnswer: ExerciseAnswer = { questionId, answer, timeTaken };
      
      if (existingIndex >= 0) {
        updatedAnswers[existingIndex] = newAnswer;
      } else {
        updatedAnswers.push(newAnswer);
      }

      await updateDoc(sessionRef, {
        answers: updatedAnswers
      });
    } catch (error) {
      console.error('[SessionService] Error updating answer:', error);
      throw new Error('Failed to update answer');
    }
  }

  /**
   * Complete exercise session with final score
   */
  async completeSession(
    sessionId: string,
    score: number,
    totalTimeSpent: number
  ): Promise<void> {
    try {
      const sessionRef = doc(db, 'exercise-sessions', sessionId);
      
      await updateDoc(sessionRef, {
        completedAt: serverTimestamp(),
        score,
        timeSpent: totalTimeSpent,
        status: 'completed'
      });
      
      console.log('[SessionService] Completed session:', sessionId, 'Score:', score);
    } catch (error) {
      console.error('[SessionService] Error completing session:', error);
      throw new Error('Failed to complete session');
    }
  }

  /**
   * Abandon session (user left without completing)
   */
  async abandonSession(sessionId: string, timeSpent: number): Promise<void> {
    try {
      const sessionRef = doc(db, 'exercise-sessions', sessionId);
      
      await updateDoc(sessionRef, {
        timeSpent,
        status: 'abandoned'
      });
    } catch (error) {
      console.error('[SessionService] Error abandoning session:', error);
      // Don't throw here as this might be called during cleanup
    }
  }

  /**
   * Get specific session
   */
  async getSession(sessionId: string): Promise<ExerciseSession | null> {
    try {
      const sessionRef = doc(db, 'exercise-sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (sessionSnap.exists()) {
        return {
          id: sessionSnap.id,
          ...sessionSnap.data()
        } as ExerciseSession;
      }
      
      return null;
    } catch (error) {
      console.error('[SessionService] Error getting session:', error);
      throw new Error('Failed to get session');
    }
  }

  /**
   * Get user's session history
   */
  async getUserSessions(
    userId: string,
    exerciseType?: ExerciseType,
    limit?: number
  ): Promise<ExerciseSession[]> {
    try {
      // Simple query that only filters by userId to avoid composite index requirement
      const q = query(
        collection(db, 'exercise-sessions'),
        where('userId', '==', userId)
      );

      const sessionSnap = await getDocs(q);
      let sessions: ExerciseSession[] = [];
      
      sessionSnap.forEach((doc) => {
        sessions.push({
          id: doc.id,
          ...doc.data()
        } as ExerciseSession);
      });

      // Filter by exercise type in memory if specified
      if (exerciseType) {
        sessions = sessions.filter(session => session.exerciseType === exerciseType);
      }

      // Sort by startedAt in memory (descending - newest first)
      sessions.sort((a, b) => {
        const aTime = a.startedAt?.seconds || 0;
        const bTime = b.startedAt?.seconds || 0;
        return bTime - aTime;
      });

      return limit ? sessions.slice(0, limit) : sessions;
    } catch (error) {
      console.error('[SessionService] Error getting user sessions:', error);
      throw new Error('Failed to get user sessions');
    }
  }

  /**
   * Get user's statistics
   */
  async getUserStats(userId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
    totalTimeSpent: number;
    byExerciseType: Record<ExerciseType, {
      sessions: number;
      completed: number;
      averageScore: number;
    }>;
  }> {
    try {
      const sessions = await this.getUserSessions(userId);
      
      const stats = {
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        averageScore: 0,
        totalTimeSpent: sessions.reduce((total, s) => total + s.timeSpent, 0),
        byExerciseType: {
          reading: { sessions: 0, completed: 0, averageScore: 0 },
          writing: { sessions: 0, completed: 0, averageScore: 0 },
          listening: { sessions: 0, completed: 0, averageScore: 0 },
          speaking: { sessions: 0, completed: 0, averageScore: 0 },
        } as Record<ExerciseType, { sessions: number; completed: number; averageScore: number; }>
      };

      const completedSessions = sessions.filter(s => s.status === 'completed' && s.score !== undefined);
      if (completedSessions.length > 0) {
        stats.averageScore = completedSessions.reduce((total, s) => total + (s.score || 0), 0) / completedSessions.length;
      }

      // Calculate by exercise type
      sessions.forEach(session => {
        const typeStats = stats.byExerciseType[session.exerciseType];
        typeStats.sessions++;
        if (session.status === 'completed') {
          typeStats.completed++;
        }
      });

      // Calculate average scores by type
      Object.keys(stats.byExerciseType).forEach(type => {
        const typeKey = type as ExerciseType;
        const typeSessions = completedSessions.filter(s => s.exerciseType === typeKey);
        if (typeSessions.length > 0) {
          stats.byExerciseType[typeKey].averageScore = 
            typeSessions.reduce((total, s) => total + (s.score || 0), 0) / typeSessions.length;
        }
      });

      return stats;
    } catch (error) {
      console.error('[SessionService] Error getting user stats:', error);
      throw new Error('Failed to get user statistics');
    }
  }
}

export const sessionService = new SessionService();