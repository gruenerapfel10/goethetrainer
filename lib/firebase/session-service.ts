import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  increment,
  DocumentData,
  QueryDocumentSnapshot,
  startAfter,
  addDoc,
} from 'firebase/firestore'
import { db } from './config'

// Types
export type SkillType = 'reading' | 'writing' | 'listening' | 'speaking'
export type SessionStatus = 'active' | 'completed' | 'abandoned' | 'paused'
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Session {
  id: string
  userId: string
  skillType: SkillType
  status: SessionStatus
  
  // Timestamps
  startedAt: Timestamp
  completedAt?: Timestamp | null
  lastActivityAt: Timestamp
  duration: number
  activeDuration: number
  
  // Configuration
  level: Level
  difficulty: Difficulty
  mode?: string
  topic?: string
  
  // Performance
  score: number
  accuracy: number
  completionRate: number
  
  // Metrics (skill-specific)
  metrics?: {
    // Reading
    wordsPerMinute?: number
    comprehensionScore?: number
    vocabularyScore?: number
    
    // Writing
    wordCount?: number
    grammarScore?: number
    coherenceScore?: number
    vocabularyDiversity?: number
    
    // Listening
    firstAttemptAccuracy?: number
    replayCount?: number
    
    // Speaking
    pronunciationScore?: number
    fluencyScore?: number
    intonationScore?: number
    speechRate?: number
  }
  
  // Content
  contentId?: string
  contentTitle?: string
  contentSource?: string
  
  // Progress tracking
  checkpoints?: Array<{
    timestamp: Timestamp
    progress: number
    score: number
    notes?: string
  }>
  
  // Mistakes
  mistakes?: Array<{
    timestamp: Timestamp
    type: string
    original: string
    correct: string
    explanation?: string
  }>
  
  // User feedback
  userRating?: number | null
  userNotes?: string
  bookmarked?: boolean
  
  // AI insights
  aiInsights?: {
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    nextLevel?: string
  }
}

export interface SessionConfig {
  skillType: SkillType
  level: Level
  difficulty: Difficulty
  mode?: string
  topic?: string
  contentId?: string
  contentTitle?: string
}

export interface SessionResults {
  score: number
  accuracy: number
  completionRate: number
  metrics?: Session['metrics']
  mistakes?: Session['mistakes']
  aiInsights?: Session['aiInsights']
}

export interface Activity {
  id?: string
  timestamp: Timestamp
  type: string
  data: any
  correct?: boolean | null
  timeSpent: number
  attempts: number
}

export interface UserProgress {
  skillType: SkillType
  currentLevel: Level
  totalSessions: number
  totalTime: number
  averageScore: number
  bestScore: number
  lastSessionDate: Timestamp
  
  // Weekly stats
  weeklyGoal: number
  weeklyProgress: number
  streak: number
  longestStreak: number
  
  // Level progression
  levelProgress: {
    [key in Level]: {
      completed: boolean
      score: number
      sessions: number
    }
  }
  
  // Statistics
  statistics: {
    totalWords?: number
    totalMinutes?: number
    vocabularyMastered: number
    grammarPointsMastered: number
    averageAccuracy: number
    improvementRate: number
  }
}

class SessionService {
  private sessionTimers: Map<string, NodeJS.Timeout> = new Map()

  // Session Lifecycle Methods
  async createSession(userId: string, config: SessionConfig): Promise<Session> {
    const sessionData: any = {
      userId,
      skillType: config.skillType,
      status: 'active',
      
      // Timestamps
      startedAt: Timestamp.now(),
      completedAt: null,
      lastActivityAt: Timestamp.now(),
      duration: 0,
      activeDuration: 0,
      
      // Configuration
      level: config.level,
      difficulty: config.difficulty,
      
      // Initialize scores
      score: 0,
      accuracy: 0,
      completionRate: 0,
      
      // Initialize arrays
      checkpoints: [],
      mistakes: [],
      
      // User feedback
      bookmarked: false,
    }

    // Add optional fields only if they're defined
    if (config.mode !== undefined) {
      sessionData.mode = config.mode
    }
    if (config.topic !== undefined) {
      sessionData.topic = config.topic
    }
    if (config.contentId !== undefined) {
      sessionData.contentId = config.contentId
    }
    if (config.contentTitle !== undefined) {
      sessionData.contentTitle = config.contentTitle
    }

    const docRef = await addDoc(collection(db, 'sessions'), sessionData)
    
    // Start auto-save timer
    this.startAutoSave(docRef.id)
    
    return { id: docRef.id, ...sessionData } as Session
  }

  async pauseSession(sessionId: string): Promise<void> {
    const now = Timestamp.now()
    await updateDoc(doc(db, 'sessions', sessionId), {
      status: 'paused',
      lastActivityAt: now,
    })
    
    // Clear auto-save timer
    this.stopAutoSave(sessionId)
  }

  async resumeSession(sessionId: string): Promise<void> {
    const now = Timestamp.now()
    await updateDoc(doc(db, 'sessions', sessionId), {
      status: 'active',
      lastActivityAt: now,
    })
    
    // Restart auto-save timer
    this.startAutoSave(sessionId)
  }

  async completeSession(sessionId: string, results: SessionResults): Promise<void> {
    const session = await this.getSession(sessionId)
    if (!session) throw new Error('Session not found')
    
    const now = Timestamp.now()
    const duration = now.seconds - session.startedAt.seconds
    
    await updateDoc(doc(db, 'sessions', sessionId), {
      status: 'completed',
      completedAt: now,
      lastActivityAt: now,
      duration,
      activeDuration: duration, // TODO: Calculate actual active time
      ...results,
    })
    
    // Update user progress
    await this.updateUserProgress(session.userId, session.skillType, results)
    
    // Clear auto-save timer
    this.stopAutoSave(sessionId)
  }

  async abandonSession(sessionId: string): Promise<void> {
    const now = Timestamp.now()
    await updateDoc(doc(db, 'sessions', sessionId), {
      status: 'abandoned',
      lastActivityAt: now,
    })
    
    // Clear auto-save timer
    this.stopAutoSave(sessionId)
  }

  // Session Data Methods
  async getSession(sessionId: string): Promise<Session | null> {
    const docSnap = await getDoc(doc(db, 'sessions', sessionId))
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() } as Session
  }

  async getUserSessions(
    userId: string,
    skillType?: SkillType,
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
    pageSize: number = 20
  ): Promise<{ sessions: Session[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    let q = query(
      collection(db, 'sessions'),
      where('userId', '==', userId),
      orderBy('startedAt', 'desc'),
      limit(pageSize)
    )
    
    if (skillType) {
      q = query(
        collection(db, 'sessions'),
        where('userId', '==', userId),
        where('skillType', '==', skillType),
        orderBy('startedAt', 'desc'),
        limit(pageSize)
      )
    }
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc))
    }
    
    const snapshot = await getDocs(q)
    const sessions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Session[]
    
    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null
    
    return { sessions, lastDoc: newLastDoc }
  }

  async getActiveSession(userId: string, skillType: SkillType): Promise<Session | null> {
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', userId),
      where('skillType', '==', skillType),
      where('status', 'in', ['active', 'paused']),
      orderBy('startedAt', 'desc'),
      limit(1)
    )
    
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() } as Session
  }

  // Activity Methods
  async recordActivity(sessionId: string, activity: Omit<Activity, 'id'>): Promise<void> {
    await addDoc(
      collection(db, 'sessions', sessionId, 'activities'),
      activity
    )
    
    // Update last activity timestamp
    await updateDoc(doc(db, 'sessions', sessionId), {
      lastActivityAt: Timestamp.now(),
    })
  }

  async getSessionActivities(sessionId: string): Promise<Activity[]> {
    const q = query(
      collection(db, 'sessions', sessionId, 'activities'),
      orderBy('timestamp', 'asc')
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Activity[]
  }

  // Progress Methods
  async getUserProgress(userId: string, skillType: SkillType): Promise<UserProgress | null> {
    const docSnap = await getDoc(doc(db, 'users', userId, 'progress', skillType))
    if (!docSnap.exists()) {
      // Initialize progress if doesn't exist
      return await this.initializeUserProgress(userId, skillType)
    }
    return docSnap.data() as UserProgress
  }

  private async initializeUserProgress(userId: string, skillType: SkillType): Promise<UserProgress> {
    const initialProgress: UserProgress = {
      skillType,
      currentLevel: 'A1',
      totalSessions: 0,
      totalTime: 0,
      averageScore: 0,
      bestScore: 0,
      lastSessionDate: Timestamp.now(),
      
      weeklyGoal: 3,
      weeklyProgress: 0,
      streak: 0,
      longestStreak: 0,
      
      levelProgress: {
        A1: { completed: false, score: 0, sessions: 0 },
        A2: { completed: false, score: 0, sessions: 0 },
        B1: { completed: false, score: 0, sessions: 0 },
        B2: { completed: false, score: 0, sessions: 0 },
        C1: { completed: false, score: 0, sessions: 0 },
        C2: { completed: false, score: 0, sessions: 0 },
      },
      
      statistics: {
        vocabularyMastered: 0,
        grammarPointsMastered: 0,
        averageAccuracy: 0,
        improvementRate: 0,
      }
    }
    
    await setDoc(doc(db, 'users', userId, 'progress', skillType), initialProgress)
    return initialProgress
  }

  private async updateUserProgress(userId: string, skillType: SkillType, results: SessionResults): Promise<void> {
    const progressRef = doc(db, 'users', userId, 'progress', skillType)
    const progress = await this.getUserProgress(userId, skillType)
    
    if (!progress) return
    
    // Calculate new statistics
    const newTotalSessions = progress.totalSessions + 1
    const newAverageScore = (progress.averageScore * progress.totalSessions + results.score) / newTotalSessions
    const newBestScore = Math.max(progress.bestScore, results.score)
    
    // Update streak
    const today = new Date()
    const lastSession = progress.lastSessionDate.toDate()
    const daysSinceLastSession = Math.floor((today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24))
    
    let newStreak = progress.streak
    if (daysSinceLastSession === 1) {
      newStreak++
    } else if (daysSinceLastSession > 1) {
      newStreak = 1
    }
    
    const newLongestStreak = Math.max(progress.longestStreak, newStreak)
    
    // Update level progress
    const currentLevelProgress = { ...progress.levelProgress }
    const sessionLevel = await this.determineSessionLevel(results.score)
    if (sessionLevel && currentLevelProgress[sessionLevel]) {
      currentLevelProgress[sessionLevel].sessions++
      currentLevelProgress[sessionLevel].score = Math.max(
        currentLevelProgress[sessionLevel].score,
        results.score
      )
      if (results.score >= 80) {
        currentLevelProgress[sessionLevel].completed = true
      }
    }
    
    await updateDoc(progressRef, {
      totalSessions: newTotalSessions,
      averageScore: newAverageScore,
      bestScore: newBestScore,
      lastSessionDate: Timestamp.now(),
      streak: newStreak,
      longestStreak: newLongestStreak,
      levelProgress: currentLevelProgress,
      'statistics.averageAccuracy': results.accuracy,
    })
  }

  // Helper Methods
  private async determineSessionLevel(score: number): Promise<Level | null> {
    if (score >= 90) return 'C2'
    if (score >= 80) return 'C1'
    if (score >= 70) return 'B2'
    if (score >= 60) return 'B1'
    if (score >= 50) return 'A2'
    if (score >= 0) return 'A1'
    return null
  }

  private startAutoSave(sessionId: string): void {
    // Clear existing timer if any
    this.stopAutoSave(sessionId)
    
    // Set up auto-save every 30 seconds
    const timer = setInterval(async () => {
      try {
        await updateDoc(doc(db, 'sessions', sessionId), {
          lastActivityAt: Timestamp.now(),
        })
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, 30000)
    
    this.sessionTimers.set(sessionId, timer)
  }

  private stopAutoSave(sessionId: string): void {
    const timer = this.sessionTimers.get(sessionId)
    if (timer) {
      clearInterval(timer)
      this.sessionTimers.delete(sessionId)
    }
  }

  // Content Methods
  async getContent(skillType: SkillType, level: Level): Promise<any[]> {
    const q = query(
      collection(db, 'content', skillType),
      where('level', '==', level),
      orderBy('createdAt', 'desc'),
      limit(10)
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }

  async getNextContent(userId: string, skillType: SkillType): Promise<any | null> {
    // Get user's current level
    const progress = await this.getUserProgress(userId, skillType)
    if (!progress) return null
    
    // Get content for user's level
    const content = await this.getContent(skillType, progress.currentLevel)
    
    // TODO: Implement smart content selection based on user history
    // For now, return first available content
    return content[0] || null
  }

  // Checkpoint Methods
  async saveCheckpoint(sessionId: string, progress: number, score: number, notes?: string): Promise<void> {
    const session = await this.getSession(sessionId)
    if (!session) throw new Error('Session not found')
    
    const checkpoint = {
      timestamp: Timestamp.now(),
      progress,
      score,
      notes,
    }
    
    const checkpoints = session.checkpoints || []
    checkpoints.push(checkpoint)
    
    await updateDoc(doc(db, 'sessions', sessionId), {
      checkpoints,
      lastActivityAt: Timestamp.now(),
    })
  }

  // Mistake Tracking
  async recordMistake(
    sessionId: string,
    type: string,
    original: string,
    correct: string,
    explanation?: string
  ): Promise<void> {
    const session = await this.getSession(sessionId)
    if (!session) throw new Error('Session not found')
    
    const mistake = {
      timestamp: Timestamp.now(),
      type,
      original,
      correct,
      explanation,
    }
    
    const mistakes = session.mistakes || []
    mistakes.push(mistake)
    
    await updateDoc(doc(db, 'sessions', sessionId), {
      mistakes,
      lastActivityAt: Timestamp.now(),
    })
  }

  // Session Statistics
  async getSessionStats(userId: string, skillType: SkillType, days: number = 30): Promise<any> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', userId),
      where('skillType', '==', skillType),
      where('startedAt', '>=', Timestamp.fromDate(startDate)),
      where('status', '==', 'completed'),
      orderBy('startedAt', 'asc')
    )
    
    const snapshot = await getDocs(q)
    const sessions = snapshot.docs.map(doc => doc.data() as Session)
    
    // Calculate statistics
    const totalSessions = sessions.length
    const totalTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
    const averageScore = sessions.reduce((sum, s) => sum + s.score, 0) / (totalSessions || 1)
    const averageAccuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0) / (totalSessions || 1)
    
    // Group by date for chart data
    const sessionsByDate: { [date: string]: number } = {}
    const scoresByDate: { [date: string]: number[] } = {}
    
    sessions.forEach(session => {
      const date = session.startedAt.toDate().toISOString().split('T')[0]
      sessionsByDate[date] = (sessionsByDate[date] || 0) + 1
      if (!scoresByDate[date]) scoresByDate[date] = []
      scoresByDate[date].push(session.score)
    })
    
    return {
      totalSessions,
      totalTime,
      averageScore,
      averageAccuracy,
      sessionsByDate,
      scoresByDate,
      sessions,
    }
  }
}

export const sessionService = new SessionService()