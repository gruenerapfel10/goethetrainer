import { generateUUID } from '@/lib/utils';
import {
  SessionTypeEnum,
  getSessionConfig,
  initializeSessionData
} from './session-registry';
import './configs'; // Import to register all configs
import type { Session, SessionStatus } from './types';
import { generateSessionQuestion } from './questions/standard-generator';
import type { Question, QuestionDifficulty } from './questions/question-types';
import { getQuestionsForSession, QuestionTypeName } from './questions/question-registry';

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

/**
 * SessionManager - Handles ONLY session lifecycle operations
 * Does NOT handle questions, statistics, duration, or progress
 */
export class SessionManager {
  private sessionId: string;
  private userId: string;
  private session: Session | null = null;

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
    }
  }

  async createSession(
    type: SessionTypeEnum,
    metadata?: Record<string, any>
  ): Promise<Session> {
    const config = getSessionConfig(type);
    const initialData = initializeSessionData(type);
    const difficulty = (metadata?.difficulty as QuestionDifficulty) || 'intermediate';

    const session: Session = {
      id: this.sessionId,
      userId: this.userId,
      type: type as any,
      status: 'active' as SessionStatus,
      startedAt: new Date(),
      duration: 0,
      data: {
        ...initialData,
        questions: [],
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
        await generateLayoutQuestions(
          config.fixedLayout,
          type,
          difficulty,
          this.sessionId
        );
      } catch (error) {
        console.error('Failed to generate questions:', error);
      }
    }

    return session;
  }

  async pauseSession(): Promise<Session> {
    if (!this.session || this.session.status !== 'active') {
      throw new Error('No active session to pause');
    }

    this.session.status = 'paused';

    const { updateSession } = await import('./queries');
    await updateSession(this.session);

    return this.session;
  }

  async resumeSession(): Promise<Session> {
    if (!this.session || this.session.status !== 'paused') {
      throw new Error('No paused session to resume');
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

  getSupportedQuestionTypes(): QuestionTypeName[] {
    if (!this.session) return [];
    return getQuestionsForSession(this.session.type as SessionTypeEnum);
  }

  // Static helper methods
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
