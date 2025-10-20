import { generateUUID } from '@/lib/utils';
import {
  SessionTypeEnum,
  getSessionConfig,
  initializeSessionData,
  calculateSessionMetrics
} from './session-registry';
import './configs'; // Import to register all configs
import type { Session, SessionStatus, SessionStats, SessionAnalytics } from './types';
import { generateProgressively } from './questions/progressive-generator';
import { markQuestions } from './questions/question-marker';
import type { Question, UserAnswer, QuestionResult, QuestionDifficulty } from './questions/question-types';
import { getQuestionsForSession, QuestionTypeName } from './questions/question-registry';

export class SessionManager {
  private sessionId: string;
  private userId: string;
  private session: Session | null = null;
  private startTime: Date | null = null;
  private pausedDuration: number = 0;
  private lastPauseTime: Date | null = null;
  
  // Question flow management
  private questions: Question[] = [];
  private currentQuestionIndex: number = 0;
  private userAnswers: UserAnswer[] = [];
  private questionResults: QuestionResult[] = [];

  constructor(userId: string, sessionId?: string) {
    this.userId = userId;
    this.sessionId = sessionId || generateUUID();
  }

  async initialize(sessionId?: string): Promise<void> {
    if (sessionId) {
      this.sessionId = sessionId;
      const { getSessionById } = await import('./queries');
      this.session = await getSessionById(sessionId);
      if (!this.session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      // Restore questions from session data if available
      if (this.session.data?.allQuestions) {
        this.questions = this.session.data.allQuestions;
        this.currentQuestionIndex = this.session.data.currentQuestionIndex || 0;
        this.userAnswers = this.session.data.answers || [];
        this.questionResults = this.session.data.results || [];
      } else {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.questionResults = [];
      }
    }
  }

  async createSession(
    type: SessionTypeEnum,
    metadata?: Record<string, any>,
    onQuestionGenerated?: (question: Question) => void
  ): Promise<Session> {
    const config = getSessionConfig(type);
    const initialData = initializeSessionData(type);

    const difficulty = (metadata?.difficulty as QuestionDifficulty) || 'intermediate';
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.userAnswers = [];
    this.questionResults = [];
    
    const session: Session = {
      id: this.sessionId,
      userId: this.userId,
      type: type as any, // Cast to match existing type system
      status: 'active' as SessionStatus,
      startedAt: new Date(),
      duration: 0,
      data: {
        ...initialData,
        // Store question-related data
        totalQuestions: this.questions.length,
        questionsAnswered: 0,
        currentQuestionIndex: 0,
        allQuestions: this.questions, // Store the full questions array
        answers: [],
        results: [],
      },
      metadata: {
        ...metadata,
        config: {
          displayName: config.metadata.displayName,
          icon: config.metadata.icon,
          color: config.metadata.color,
        },
        questions: this.questions.map(q => ({
          id: q.id,
          type: q.type,
          difficulty: q.difficulty,
          points: q.points
        }))
      }
    } as Session;

    const { saveSession } = await import('./queries');
    await saveSession(session);

    this.session = session;
    this.startTime = new Date();

    // Start progressive generation if layout is defined
    if (config.questionLayout) {
      generateProgressively({
        layout: config.questionLayout,
        sessionType: type,
        difficulty,
        onQuestionGenerated: (question) => {
          this.questions.push(question);
          // Update session data
          if (this.session) {
            this.session.data.allQuestions = this.questions;
          }
          onQuestionGenerated?.(question);
        }
      }).catch(console.error);
    }

    return session;
  }

  async updateSessionData(updates: Record<string, any>): Promise<Session> {
    if (!this.session) {
      throw new Error('No active session to update');
    }

    const type = this.session.type as SessionTypeEnum;
    
    // Always keep questions synced
    const questionsData = {
      allQuestions: this.questions,
      currentQuestionIndex: this.currentQuestionIndex,
    };
    
    // Merge updates with existing data
    const updatedData = {
      ...this.session.data,
      ...questionsData,
      ...updates
    };

    // Update session
    this.session.data = updatedData;
    this.session.duration = this.calculateDuration();

    // Calculate and store metrics
    const metrics = calculateSessionMetrics(type, updatedData, this.session.duration);
    this.session.metadata = {
      ...this.session.metadata,
      metrics
    };

    const { updateSession } = await import('./queries');
    await updateSession(this.session);
    
    return this.session;
  }

  async pauseSession(): Promise<Session> {
    if (!this.session || this.session.status !== 'active') {
      throw new Error('No active session to pause');
    }

    this.session.status = 'paused';
    this.lastPauseTime = new Date();
    
    const { updateSession } = await import('./queries');
    await updateSession(this.session);
    
    return this.session;
  }

  async resumeSession(): Promise<Session> {
    if (!this.session || this.session.status !== 'paused') {
      throw new Error('No paused session to resume');
    }

    if (this.lastPauseTime) {
      this.pausedDuration += Date.now() - this.lastPauseTime.getTime();
      this.lastPauseTime = null;
    }
    
    this.session.status = 'active';
    
    const { updateSession } = await import('./queries');
    await updateSession(this.session);
    
    return this.session;
  }

  async endSession(status: 'completed' | 'abandoned' = 'completed'): Promise<Session> {
    if (!this.session) {
      throw new Error('No active session to end');
    }

    this.session.status = status;
    this.session.endedAt = new Date();
    this.session.duration = this.calculateDuration();

    // Calculate final metrics
    const type = this.session.type as SessionTypeEnum;
    const metrics = calculateSessionMetrics(type, this.session.data, this.session.duration);
    this.session.metadata = {
      ...this.session.metadata,
      metrics,
      finalMetrics: metrics
    };

    // Check if targets were met
    const config = getSessionConfig(type);
    if (config.defaults.targetMetrics) {
      const targetsAchieved: Record<string, boolean> = {};
      Object.entries(config.defaults.targetMetrics).forEach(([key, target]) => {
        const actual = this.session!.data[key] || metrics[key] || 0;
        targetsAchieved[key] = actual >= target;
      });
      this.session.metadata.targetsAchieved = targetsAchieved;
    }

    const { updateSession } = await import('./queries');
    await updateSession(this.session);
    
    return this.session;
  }

  private calculateDuration(): number {
    if (!this.startTime) return 0;
    
    const totalTime = Date.now() - this.startTime.getTime();
    const activeDuration = totalTime - this.pausedDuration;
    
    // Add current pause duration if currently paused
    if (this.lastPauseTime) {
      const currentPauseDuration = Date.now() - this.lastPauseTime.getTime();
      return Math.round((activeDuration - currentPauseDuration) / 1000);
    }
    
    return Math.round(activeDuration / 1000);
  }

  getSession(): Session | null {
    return this.session;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getDuration(): number {
    return this.calculateDuration();
  }

  getCurrentMetrics(): Record<string, number> | null {
    if (!this.session) return null;
    
    const type = this.session.type as SessionTypeEnum;
    return calculateSessionMetrics(type, this.session.data, this.calculateDuration());
  }

  // Question flow methods
  getCurrentQuestion(): Question | null {
    if (!this.questions.length || this.currentQuestionIndex >= this.questions.length) {
      return null;
    }
    return this.questions[this.currentQuestionIndex];
  }

  getNextQuestion(): Question | null {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      if (this.session) {
        this.session.data.currentQuestionIndex = this.currentQuestionIndex;
      }
      return this.questions[this.currentQuestionIndex];
    }
    return null;
  }

  getPreviousQuestion(): Question | null {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      if (this.session) {
        this.session.data.currentQuestionIndex = this.currentQuestionIndex;
      }
      return this.questions[this.currentQuestionIndex];
    }
    return null;
  }

  async submitAnswer(
    questionId: string,
    answer: string | string[] | boolean,
    timeSpent: number = 0,
    hintsUsed: number = 0
  ): Promise<QuestionResult> {
    if (!this.session) {
      throw new Error('No active session');
    }

    const question = this.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    // Create user answer
    const userAnswer: UserAnswer = {
      questionId,
      answer,
      timeSpent,
      attempts: 1,
      hintsUsed,
      timestamp: new Date()
    };

    // Check if already answered
    const existingIndex = this.userAnswers.findIndex(a => a.questionId === questionId);
    if (existingIndex >= 0) {
      // Update attempts count
      userAnswer.attempts = this.userAnswers[existingIndex].attempts + 1;
      this.userAnswers[existingIndex] = userAnswer;
    } else {
      this.userAnswers.push(userAnswer);
    }

    // Mark the answer
    const [result] = await markQuestions([question], [userAnswer]);
    
    // Update or add result
    const resultIndex = this.questionResults.findIndex(r => r.questionId === questionId);
    if (resultIndex >= 0) {
      this.questionResults[resultIndex] = result;
    } else {
      this.questionResults.push(result);
    }

    // Update session data
    await this.updateSessionData({
      questionsAnswered: this.userAnswers.length,
      currentScore: this.questionResults.reduce((sum, r) => sum + r.score, 0),
      maxPossibleScore: this.questions.reduce((sum, q) => sum + q.points, 0),
      lastAnsweredQuestion: questionId,
      answers: this.userAnswers,
      results: this.questionResults.map(r => ({
        questionId: r.questionId,
        score: r.score,
        maxScore: r.maxScore,
        isCorrect: r.isCorrect,
        feedback: r.feedback
      }))
    });

    return result;
  }

  async completeQuestionFlow(): Promise<{
    totalScore: number;
    maxScore: number;
    percentage: number;
    results: QuestionResult[];
  }> {
    if (!this.session) {
      throw new Error('No active session');
    }

    // Mark any unanswered questions as incorrect
    const allResults = await markQuestions(this.questions, this.userAnswers);
    this.questionResults = allResults;

    const totalScore = allResults.reduce((sum, r) => sum + r.score, 0);
    const maxScore = this.questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Update session with final results
    await this.updateSessionData({
      questionsCompleted: true,
      finalScore: totalScore,
      finalMaxScore: maxScore,
      scorePercentage: percentage,
      allResults: allResults.map(r => ({
        questionId: r.questionId,
        score: r.score,
        maxScore: r.maxScore,
        isCorrect: r.isCorrect,
        feedback: r.feedback,
        markedBy: r.markedBy
      }))
    });

    return {
      totalScore,
      maxScore,
      percentage,
      results: allResults
    };
  }

  getQuestionProgress(): {
    current: number;
    total: number;
    answered: number;
    unanswered: number;
    percentage: number;
  } {
    const answered = this.userAnswers.length;
    const total = this.questions.length;
    
    return {
      current: this.currentQuestionIndex + 1,
      total,
      answered,
      unanswered: total - answered,
      percentage: total > 0 ? (answered / total) * 100 : 0
    };
  }

  getAllQuestions(): Question[] {
    return this.questions;
  }

  getQuestionResults(): QuestionResult[] {
    return this.questionResults;
  }
  
  getSupportedQuestionTypes(): QuestionTypeName[] {
    if (!this.session) return [];
    return getQuestionsForSession(this.session.type as SessionTypeEnum);
  }

  // Static helper methods
  static async getUserStats(userId: string): Promise<SessionStats> {
    const { getUserSessionStats } = await import('./queries');
    return await getUserSessionStats(userId);
  }

  static async getSessionAnalytics(userId: string, days: number = 30): Promise<SessionAnalytics> {
    const { getSessionAnalytics } = await import('./queries');
    return await getSessionAnalytics(userId, days);
  }

  static getAvailableSessionTypes(): Array<{
    type: SessionTypeEnum;
    metadata: ReturnType<typeof getSessionConfig>['metadata'];
    features: ReturnType<typeof getSessionConfig>['features'];
  }> {
    return Object.values(SessionTypeEnum).map(type => {
      const config = getSessionConfig(type);
      return {
        type,
        metadata: config.metadata,
        features: config.features
      };
    });
  }
}

// Helper function to get or create session manager
export async function getSessionManager(
  userId: string, 
  sessionId?: string
): Promise<SessionManager> {
  const manager = new SessionManager(userId, sessionId);
  if (sessionId) {
    await manager.initialize(sessionId);
  }
  return manager;
}