import { generateUUID } from '@/lib/utils';
import {
  SessionTypeEnum,
  getSessionConfig,
  getSupportedQuestionTypes,
  getSessionLayout,
  initializeSessionData,
} from './session-registry';
import './configs'; // Ensure registry is populated
import type { Session, SessionStatus, UpdateSessionInput } from './types';
import { QuestionTypeName } from './questions/question-registry';
import {
  Question,
  QuestionDifficulty,
  QuestionResult,
} from './questions/question-types';
import { generateSessionQuestion } from './questions/standard-generator';
import { QuestionManager } from './question-manager';

interface GenerateQuestionsOptions {
  difficulty?: QuestionDifficulty;
  layout?: QuestionTypeName[];
  replaceExisting?: boolean;
}

interface CompletionSummary {
  totalScore: number;
  maxScore: number;
  percentage: number;
  results: QuestionResult[];
}

export class SessionManager {
  private readonly userId: string;
  private sessionId: string;
  private session: Session | null = null;
  private questionsCache: Question[] | null = null;

  constructor(userId: string, sessionId?: string) {
    this.userId = userId;
    this.sessionId = sessionId || generateUUID();
  }

  async initialize(sessionId?: string): Promise<void> {
    if (sessionId) {
      this.sessionId = sessionId;
    }
    this.session = await this.loadSessionFromStore();
    if (!this.session) {
      throw new Error(`Session ${this.sessionId} not found`);
    }
    this.questionsCache = [...(this.session.data?.questions ?? [])];
  }

  async createSession(
    type: SessionTypeEnum,
    metadata?: Record<string, any>
  ): Promise<Session> {
    const config = getSessionConfig(type);
    const initialData = initializeSessionData(type);
    const now = new Date();

    const session: Session = {
      id: this.sessionId,
      userId: this.userId,
      type: type,
      status: 'active',
      startedAt: now,
      duration: 0,
      metadata: {
        ...metadata,
        config: {
          displayName: config.metadata.displayName,
          icon: config.metadata.icon,
          color: config.metadata.color,
        },
      },
      data: {
        ...initialData,
        questions: [],
        answers: [],
        results: [],
      },
    };

    const { saveSession } = await import('./queries');
    await saveSession(session);

    this.session = session;
    this.questionsCache = [];

    return session;
  }

  async generateQuestions(options: GenerateQuestionsOptions = {}): Promise<Question[]> {
    const session = await this.ensureSessionLoaded();
    const sessionType = session.type as SessionTypeEnum;
    const difficulty =
      options.difficulty ||
      (session.metadata?.difficulty as QuestionDifficulty) ||
      QuestionDifficulty.INTERMEDIATE;

    const layout = options.layout && options.layout.length > 0
      ? options.layout
      : getSessionLayout(sessionType);

    const generationPlan =
      layout.length > 0 ? layout : getSupportedQuestionTypes(sessionType);

    if (!generationPlan.length) {
      throw new Error(`No question types registered for session type "${sessionType}"`);
    }

    const generatedQuestions: Question[] = [];
    let teilNumber = 1;

    for (const questionType of generationPlan) {
      const teilQuestions = await this.generateTeilQuestions(
        questionType,
        sessionType,
        difficulty,
        teilNumber
      );
      if (teilQuestions.length > 0) {
        generatedQuestions.push(...teilQuestions);
        teilNumber += 1;
      }
    }

    const mergedQuestions = options.replaceExisting === false
      ? [...(session.data.questions ?? []), ...generatedQuestions]
      : generatedQuestions;

    session.data.questions = mergedQuestions.map(question => ({
      ...question,
      answered: false,
      answer: undefined,
      lastSubmittedAt: undefined,
    }));
    session.data.answers = [];
    session.data.results = [];
    session.metadata = {
      ...session.metadata,
      difficulty,
    };

    await this.persistSession(session);
    this.questionsCache = [...mergedQuestions];

    return mergedQuestions;
  }

  async submitAnswer(
    questionId: string,
    answer: string | string[] | boolean,
    timeSpent: number = 0,
    hintsUsed: number = 0
  ): Promise<QuestionResult> {
    const session = await this.ensureSessionLoaded();
    const questions = session.data.questions ?? [];
    if (!questions.length) {
      throw new Error('No questions available for this session');
    }

    const questionManager = new QuestionManager(
      questions,
      session.data.answers ?? [],
      session.data.results ?? []
    );

    const result = await questionManager.submitAnswer(
      questionId,
      answer,
      timeSpent,
      hintsUsed
    );

    const state = questionManager.getState();
    const scoreStats = questionManager.getScoreStats();

    session.data.questions = state.questions.map(question =>
      question.id === questionId
        ? {
            ...question,
            answered: true,
            answer,
            lastSubmittedAt: new Date().toISOString(),
          }
        : question
    );
    session.data.answers = state.answers;
    session.data.results = state.results;
    session.data.currentScore = scoreStats.currentScore;
    session.data.maxPossibleScore = scoreStats.maxPossibleScore;
    session.data.questionsAnswered = state.answers.length;
    session.data.lastAnsweredQuestion = questionId;

    await this.persistSession(session);
    this.questionsCache = [...session.data.questions];

    return result;
  }

  async submitAnswersBulk(
    answers: Array<{
      questionId: string;
      answer: string | string[] | boolean;
      timeSpent?: number;
      hintsUsed?: number;
    }>
  ): Promise<QuestionResult[]> {
    const session = await this.ensureSessionLoaded();
    const questions = session.data.questions ?? [];

    const questionManager = new QuestionManager(
      questions,
      session.data.answers ?? [],
      session.data.results ?? []
    );

    const results = await questionManager.submitAnswersBulk(answers);
    const state = questionManager.getState();
    const scoreStats = questionManager.getScoreStats();

    const answeredIds = new Set(answers.map(item => item.questionId));

    session.data.questions = state.questions.map(question =>
      answeredIds.has(question.id)
        ? {
            ...question,
            answered: true,
            answer: answers.find(a => a.questionId === question.id)?.answer,
            lastSubmittedAt: new Date().toISOString(),
          }
        : question
    );
    session.data.answers = state.answers;
    session.data.results = state.results;
    session.data.currentScore = scoreStats.currentScore;
    session.data.maxPossibleScore = scoreStats.maxPossibleScore;
    session.data.questionsAnswered = state.answers.length;

    if (answers.length > 0) {
      session.data.lastAnsweredQuestion = answers[answers.length - 1].questionId;
    }

    await this.persistSession(session);
    this.questionsCache = [...session.data.questions];

    return results;
  }

  async getQuestions(forceReload: boolean = false): Promise<Question[]> {
    if (!this.questionsCache || forceReload) {
      const fresh = await this.loadSessionFromStore();
      if (fresh) {
        this.session = fresh;
        this.questionsCache = [...(fresh.data?.questions ?? [])];
      } else {
        this.questionsCache = [];
      }
    }
    return this.questionsCache ? [...this.questionsCache] : [];
  }

  async completeQuestionFlow(): Promise<CompletionSummary> {
    const session = await this.ensureSessionLoaded();
    const questions = session.data.questions ?? [];
    const answers = session.data.answers ?? [];
    const existingResults = session.data.results ?? [];

    const questionManager = new QuestionManager(questions, answers, existingResults);
    const summary = await questionManager.completeAllQuestions();

    const state = questionManager.getState();

    session.data.answers = state.answers;
    session.data.results = state.results;
    session.data.currentScore = summary.totalScore;
    session.data.maxPossibleScore = summary.maxScore;
    session.data.questionsAnswered = state.answers.length;

    const answeredIds = new Set(state.answers.map(answer => answer.questionId));
    session.data.questions = session.data.questions.map(question =>
      answeredIds.has(question.id)
        ? { ...question, answered: true }
        : question
    );

    this.markSessionEnded(session, 'completed');

    await this.persistSession(session);
    this.questionsCache = [...questions];

    return summary;
  }

  async endSession(status: SessionStatus = 'completed'): Promise<Session> {
    const session = await this.ensureSessionLoaded();
    this.markSessionEnded(session, status);
    await this.persistSession(session);
    return session;
  }

  getSession(): Session | null {
    return this.session;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getSupportedQuestionTypes(): QuestionTypeName[] {
    const session = this.session;
    if (!session) {
      return [];
    }
    return getSupportedQuestionTypes(session.type as SessionTypeEnum);
  }

  async getAllQuestions(): Promise<Question[]> {
    return this.getQuestions();
  }

  async updateSession(input: UpdateSessionInput): Promise<Session> {
    const session = await this.ensureSessionLoaded();

    if (input.data) {
      session.data = {
        ...session.data,
        ...input.data,
      };
    }

    if (input.metadata) {
      session.metadata = {
        ...session.metadata,
        ...input.metadata,
      };
    }

    if (input.status) {
      session.status = input.status;
    }

    if (typeof input.duration === 'number') {
      session.duration = input.duration;
    }

    await this.persistSession(session);
    return session;
  }

  async updateSessionData(data: Partial<Session['data']>): Promise<Session> {
    return this.updateSession({ data });
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
        features: config.features,
      };
    });
  }

  private async generateTeilQuestions(
    questionType: QuestionTypeName,
    sessionType: SessionTypeEnum,
    difficulty: QuestionDifficulty,
    teil: number
  ): Promise<Question[]> {
    const rawQuestions = await generateSessionQuestion(
      sessionType,
      difficulty,
      questionType
    );

    return rawQuestions.map((question: any, index: number) => ({
      ...question,
      teil,
      order: index,
      registryType: questionType,
      answered: false,
    })) as Question[];
  }

  private async loadSessionFromStore(): Promise<Session | null> {
    const { getSessionById } = await import('./queries');
    return await getSessionById(this.sessionId);
  }

  private async persistSession(session: Session): Promise<void> {
    const { updateSession } = await import('./queries');
    await updateSession(session);
    this.session = session;
  }

  private async ensureSessionLoaded(): Promise<Session> {
    if (!this.session) {
      const loaded = await this.loadSessionFromStore();
      if (!loaded) {
        throw new Error('Session not initialised');
      }
      this.session = loaded;
      this.questionsCache = [...(loaded.data?.questions ?? [])];
    }
    return this.session;
  }

  private markSessionEnded(session: Session, status: SessionStatus): void {
    session.status = status;
    const endedAt = new Date();
    session.endedAt = endedAt;
    const startedAt = session.startedAt
      ? new Date(session.startedAt)
      : endedAt;
    const durationMs = endedAt.getTime() - startedAt.getTime();
    session.duration = Math.max(0, Math.round(durationMs / 1000));
  }
}

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
