import { generateUUID } from '@/lib/utils';
import {
  SessionTypeEnum,
  getSessionConfig,
  initializeSessionData
} from './session-registry';
import './configs'; // Import to register all configs
import type { Session, SessionStatus, SessionStats, SessionAnalytics } from './types';
import { generateSessionQuestion } from './questions/standard-generator';
import type { Question, QuestionDifficulty } from './questions/question-types';
import { getQuestionsForSession, QuestionTypeName } from './questions/question-registry';
import { QuestionManager } from './question-manager';
import { StatisticsManager } from './statistics-manager';

/**
 * Generic question generation for fixed layouts
 */
async function generateLayoutQuestions(
  layout: QuestionTypeName[],
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty,
  sessionId: string,
  startingTeil: number = 1
) {
  const { getSessionById, saveSession } = await import('./queries');
  const questions: Question[] = [];

  console.log(`\n🔧 generateLayoutQuestions: Starting with layout [${layout.join(', ')}] for session ${sessionId}`);

  for (let i = 0; i < layout.length; i++) {
    const questionType = layout[i];
    const teilNumber = startingTeil + i;

    console.log(`\n📝 generateLayoutQuestions: Generating Teil ${teilNumber} (${questionType})`);

    const layoutQuestions = await generateSessionQuestion(
      sessionType,
      difficulty,
      questionType
    );

    console.log(`✅ generateLayoutQuestions: Generated ${layoutQuestions.length} questions for Teil ${teilNumber}`);

    const converted = layoutQuestions.map((q: any) => ({
      ...q,
      teil: teilNumber,
      registryType: questionType
    }));

    questions.push(...converted);

    // Update session after each Teil
    const session = await getSessionById(sessionId);
    if (session) {
      const updatedQuestions = [...(session.data.questions || []), ...converted];
      session.data.questions = updatedQuestions;
      await saveSession(session);
      console.log(`💾 generateLayoutQuestions: Saved Teil ${teilNumber} to Firebase - Total questions: ${updatedQuestions.length}`);
    } else {
      console.error(`❌ generateLayoutQuestions: Session not found for ${sessionId}`);
    }
  }

  console.log(`\n🎉 generateLayoutQuestions: COMPLETED - Generated ${questions.length} total questions`);
  return questions;
}

export class SessionManager {
  private sessionId: string;
  private userId: string;
  private session: Session | null = null;

  // Question flow management
  private questions: Question[] = [];
  private currentQuestionIndex: number = 0;
  private questionManager: QuestionManager;
  private statisticsManager: StatisticsManager | null = null;

  constructor(userId: string, sessionId?: string) {
    this.userId = userId;
    this.sessionId = sessionId || generateUUID();
    this.questionManager = new QuestionManager();
  }

  async initialize(sessionId?: string): Promise<void> {
    if (sessionId) {
      this.sessionId = sessionId;
      const { getSessionById } = await import('./queries');
      this.session = await getSessionById(sessionId);
      if (!this.session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      // Load from session (single source of truth)
      this.questions = this.session.data?.questions || [];
    }
  }

  async createSession(
    type: SessionTypeEnum,
    metadata?: Record<string, any>
  ): Promise<Session> {
    const config = getSessionConfig(type);
    const initialData = initializeSessionData(type);

    const difficulty = (metadata?.difficulty as QuestionDifficulty) || 'intermediate';
    this.questions = [];

    // Initialize statistics manager
    this.statisticsManager = new StatisticsManager(type);
    this.statisticsManager.startTiming();

    const session: Session = {
      id: this.sessionId,
      userId: this.userId,
      type: type as any,
      status: 'active' as SessionStatus,
      startedAt: new Date(),
      duration: 0,
      data: {
        ...initialData,
        questions: this.questions,
      },
      metadata: {
        ...metadata,
        config: {
          displayName: config.metadata.displayName,
          icon: config.metadata.icon,
          color: config.metadata.color,
        }
      }
    } as Session;

    const { saveSession } = await import('./queries');
    await saveSession(session);

    this.session = session;

    // Generate questions based on fixed layout if configured
    if (config.fixedLayout && config.fixedLayout.length > 0) {
      try {
        // Generate all questions for the layout
        const allLayoutQuestions = await generateLayoutQuestions(
          config.fixedLayout,
          type,
          difficulty,
          this.sessionId
        );
        this.questions = allLayoutQuestions;
        this.questionManager.setQuestions(allLayoutQuestions);
      } catch (error) {
        console.error('Failed to generate questions:', error);
      }
    }

    return session;
  }

  async updateSessionData(updates: Record<string, any>): Promise<Session> {
    if (!this.session || !this.statisticsManager) {
      throw new Error('No active session to update');
    }

    // Update statistics manager with new data
    this.statisticsManager.updateSessionData(updates);

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
    this.session.duration = this.statisticsManager.getDuration();

    // Calculate and store metrics through statistics manager
    const metrics = this.statisticsManager.getMetrics();
    this.session.metadata = {
      ...this.session.metadata,
      metrics
    };

    const { updateSession } = await import('./queries');
    await updateSession(this.session);

    return this.session;
  }

  async endSession(status: 'completed' | 'abandoned' = 'completed'): Promise<Session> {
    if (!this.session || !this.statisticsManager) {
      throw new Error('No active session to end');
    }

    // End timing through statistics manager
    this.statisticsManager.endTiming();

    this.session.status = status;
    this.session.endedAt = new Date();
    this.session.duration = this.statisticsManager.getDuration();

    // Calculate final metrics through statistics manager
    const metrics = this.statisticsManager.getMetrics();
    this.session.metadata = {
      ...this.session.metadata,
      metrics,
      finalMetrics: metrics
    };

    // Check if targets were met using statistics manager
    const type = this.session.type as SessionTypeEnum;
    const config = getSessionConfig(type);
    if (config.defaults.targetMetrics) {
      const targetsAchieved = this.statisticsManager.checkTargetsMet(config.defaults.targetMetrics);
      this.session.metadata.targetsAchieved = targetsAchieved;
    }

    const { updateSession } = await import('./queries');
    await updateSession(this.session);

    return this.session;
  }

  getSession(): Session | null {
    return this.session;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getQuestionManager(): QuestionManager {
    return this.questionManager;
  }

  getStatisticsManager(): StatisticsManager | null {
    return this.statisticsManager;
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

  async completeQuestionFlow(): Promise<{
    totalScore: number;
    maxScore: number;
    percentage: number;
    results: any[];
  }> {
    if (!this.session) {
      throw new Error('No active session');
    }

    // Complete all questions through question manager
    const completion = await this.questionManager.completeAllQuestions();
    const allResults = this.questionManager.getQuestionResults();

    // Update session with final results
    await this.updateSessionData({
      questionsCompleted: true,
      finalScore: completion.totalScore,
      finalMaxScore: completion.maxScore,
      scorePercentage: completion.percentage,
      allResults: allResults.map(r => ({
        questionId: r.questionId,
        score: r.score,
        maxScore: r.maxScore,
        isCorrect: r.isCorrect,
        feedback: r.feedback,
        markedBy: r.markedBy
      }))
    });

    return completion;
  }

  getQuestionProgress(): {
    current: number;
    total: number;
    answered: number;
    unanswered: number;
    percentage: number;
  } {
    const stats = this.questionManager.getQuestionStats();

    return {
      current: this.currentQuestionIndex + 1,
      total: stats.total,
      answered: stats.answered,
      unanswered: stats.unanswered,
      percentage: stats.percentage
    };
  }

  getAllQuestions(): Question[] {
    return this.questions;
  }

  getQuestionResults(): any[] {
    return this.questionManager.getQuestionResults();
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