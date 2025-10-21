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
import { Question, QuestionDifficulty, QuestionResult } from './questions/question-types';
import { generateSessionQuestion } from './questions/standard-generator';
import { QuestionManager, QuestionSessionOutcome } from './question-manager';
import { StatisticsManager } from './statistics-manager';

interface GenerateQuestionsOptions {
  difficulty?: QuestionDifficulty;
  layout?: QuestionTypeName[];
  replaceExisting?: boolean;
}

interface CompletionSummary {
  results: QuestionResult[];
  summary: {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    totalScore: number;
    maxScore: number;
    percentage: number;
    pendingManualReview: number;
  };
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
    const loadedSession = await this.loadSessionFromStore();
    if (!loadedSession) {
      throw new Error(`Session ${this.sessionId} not found`);
    }
    if (!loadedSession.data || !Array.isArray(loadedSession.data.questions)) {
      throw new Error(`Session ${this.sessionId} has no question set`);
    }
    this.session = loadedSession;
    this.questionsCache = [...loadedSession.data.questions];
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

    if (!session.data || !Array.isArray(session.data.questions)) {
      throw new Error('Session questions not initialised');
    }

    const mergedQuestions =
      options.replaceExisting === false
        ? [...session.data.questions, ...generatedQuestions]
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
    timeSpent: number,
    hintsUsed: number
  ): Promise<QuestionResult> {
    const session = await this.ensureSessionLoaded();
    if (!session.data || !Array.isArray(session.data.questions)) {
      throw new Error('Session questions not initialised');
    }
    const questions = session.data.questions;
    if (questions.length === 0) {
      throw new Error('No questions available for this session');
    }

    const questionManager = new QuestionManager(
      questions,
      session.data.answers,
      session.data.results
    );

    const result = await questionManager.submitAnswer(
      questionId,
      answer,
      timeSpent,
      hintsUsed
    );

    const state = questionManager.getState();
    const totalScore = state.results.reduce((sum, item) => sum + item.score, 0);
    const maxPossibleScore = state.questions.reduce(
      (sum, item) => sum + (item.points ?? 0),
      0
    );
    const correctAnswers = state.results.filter(item => item.isCorrect).length;
    const incorrectAnswers = state.results.filter(
      item => !item.isCorrect && item.markedBy !== 'manual'
    ).length;

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
    session.data.currentScore = totalScore;
    session.data.maxPossibleScore = maxPossibleScore;
    session.data.questionsAnswered = state.answers.length;
    session.data.questionsCorrect = correctAnswers;
    session.data.questionsIncorrect = incorrectAnswers;
    session.data.lastAnsweredQuestion = questionId;

    await this.persistSession(session);
    this.questionsCache = [...session.data.questions];

    return result;
  }

  async submitAnswersBulk(
    answers: Array<{
      questionId: string;
      answer: string | string[] | boolean;
      timeSpent: number;
      hintsUsed: number;
    }>
  ): Promise<QuestionResult[]> {
    const session = await this.ensureSessionLoaded();
    if (!session.data || !Array.isArray(session.data.questions)) {
      throw new Error('Session questions not initialised');
    }
    const questions = session.data.questions;

    const questionManager = new QuestionManager(
      questions,
      session.data.answers,
      session.data.results
    );

    const results = await questionManager.submitAnswersBulk(answers);
    const state = questionManager.getState();
    const totalScore = state.results.reduce((sum, item) => sum + item.score, 0);
    const maxPossibleScore = state.questions.reduce(
      (sum, item) => sum + (item.points ?? 0),
      0
    );
    const correctAnswers = state.results.filter(item => item.isCorrect).length;
    const incorrectAnswers = state.results.filter(
      item => !item.isCorrect && item.markedBy !== 'manual'
    ).length;

    const answeredIds = new Set(answers.map(item => item.questionId));

    session.data.questions = state.questions.map(question => {
      if (!answeredIds.has(question.id)) {
        return question;
      }
      const submitted = answers.find(a => a.questionId === question.id);
      if (!submitted) {
        throw new Error(`Missing answer payload for question ${question.id}`);
      }
      return {
        ...question,
        answered: true,
        answer: submitted.answer,
        lastSubmittedAt: new Date().toISOString(),
      };
    });
    session.data.answers = state.answers;
    session.data.results = state.results;
    session.data.currentScore = totalScore;
    session.data.maxPossibleScore = maxPossibleScore;
    session.data.questionsAnswered = state.answers.length;
    session.data.questionsCorrect = correctAnswers;
    session.data.questionsIncorrect = incorrectAnswers;

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
      if (!fresh) {
        throw new Error('Session not found while loading questions');
      }
      if (!fresh.data || !Array.isArray(fresh.data.questions)) {
        throw new Error('Session questions not available');
      }
      this.session = fresh;
      this.questionsCache = [...fresh.data.questions];
    }
    await this.ensureQuestionIdentifiers();
    if (!this.questionsCache) {
      throw new Error('Question cache not initialised');
    }
    return [...this.questionsCache];
  }

  async completeQuestionFlow(): Promise<CompletionSummary> {
    const session = await this.ensureSessionLoaded();
    if (!session.data || !Array.isArray(session.data.questions)) {
      throw new Error('Session questions not initialised');
    }
    if (!Array.isArray(session.data.answers) || !Array.isArray(session.data.results)) {
      throw new Error('Session answers or results not initialised');
    }

    const questionManager = new QuestionManager(
      session.data.questions,
      session.data.answers,
      session.data.results
    );

    const outcome: QuestionSessionOutcome = await questionManager.finaliseSession();
    const state = questionManager.getState();

    const answersMap = new Map(state.answers.map(answer => [answer.questionId, answer]));

    session.data.answers = state.answers;
    session.data.results = state.results;
    session.data.questions = session.data.questions.map(question => {
      const answerEntry = answersMap.get(question.id);
      return {
        ...question,
        answered: !!answerEntry,
        answer: answerEntry ? answerEntry.answer : question.answer,
        lastSubmittedAt: answerEntry ? answerEntry.timestamp.toISOString() : question.lastSubmittedAt,
      };
    });

    this.markSessionEnded(session, 'completed');

    const statistics = StatisticsManager.calculate(session, outcome.results);
    StatisticsManager.apply(session, statistics);

    await this.persistSession(session);
    this.questionsCache = [...session.data.questions];

    return {
      results: outcome.results,
      summary: {
        totalQuestions: statistics.totalQuestions,
        answeredQuestions: statistics.answeredQuestions,
        correctAnswers: statistics.correctAnswers,
        incorrectAnswers: statistics.incorrectAnswers,
        totalScore: statistics.totalScore,
        maxScore: statistics.maxScore,
        percentage: statistics.percentage,
        pendingManualReview: statistics.pendingManualReview,
      },
    };
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
      id:
        typeof question.id === 'string' && question.id.trim().length > 0
          ? question.id
          : generateUUID(),
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

  private async ensureQuestionIdentifiers(): Promise<void> {
    if (!this.questionsCache || this.questionsCache.length === 0) {
      return;
    }

    let updated = false;
    const normalised = this.questionsCache.map(question => {
      if (typeof question.id === 'string' && question.id.trim().length > 0) {
        return question;
      }

      updated = true;
      return {
        ...question,
        id: generateUUID(),
      } as Question;
    });

    if (updated) {
      this.questionsCache = normalised;
      const session = await this.ensureSessionLoaded();
      session.data.questions = normalised;
      await this.persistSession(session);
    }
  }

  private async ensureSessionLoaded(): Promise<Session> {
    if (!this.session) {
      const loaded = await this.loadSessionFromStore();
      if (!loaded) {
        throw new Error('Session not initialised');
      }
      if (!loaded.data || !Array.isArray(loaded.data.questions)) {
        throw new Error('Session questions not available');
      }
      this.session = loaded;
      this.questionsCache = [...loaded.data.questions];
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
