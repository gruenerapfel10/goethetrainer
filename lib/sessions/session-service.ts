import { generateUUID } from '@/lib/utils';
import type {
  Session,
  SessionStatus,
  UpdateSessionInput,
  AnswerValue,
} from './types';
import type {
  Question,
  QuestionResult,
} from './questions/question-types';
import {
  SessionTypeEnum,
  getSessionConfig,
  getSessionLayout,
  getSupportedQuestionTypes,
  initializeSessionData,
} from './session-registry';
import './configs';
import {
  saveSession,
  getSessionById,
  updateSession as updateSessionDocument,
} from './queries';
import { generateSessionQuestion } from './questions/standard-generator';
import { QuestionManager } from './question-manager';
import { QuestionDifficulty } from './questions/question-types';
import { QuestionTypeName } from './questions/question-registry';
import { sanitizeForFirestore } from './utils';

export interface CompletionSummary {
  results: QuestionResult[];
  summary: {
    totalQuestions: number;
    answeredQuestions: number;
    incorrectAnswers: number;
    correctAnswers: number;
    totalScore: number;
    maxScore: number;
    percentage: number;
    pendingManualReview: number;
  };
}

interface SubmitAnswerPayload {
  questionId: string;
  answer: AnswerValue;
  timeSpent: number;
  hintsUsed: number;
}

function assertOwnership(session: Session, userId: string) {
  if (session.userId !== userId) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 403 });
  }
}

async function requireSession(sessionId: string): Promise<Session> {
  const session = await getSessionById(sessionId);
  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }
  return session;
}

async function loadSessionForUser(sessionId: string, userId: string): Promise<Session> {
  const session = await requireSession(sessionId);
  assertOwnership(session, userId);
  return session;
}

async function persistSession(session: Session): Promise<void> {
  const sanitized = sanitizeSession(session);
  await updateSessionDocument(sanitized);
}

function touchSession(session: Session) {
  if (!session.metadata) {
    session.metadata = {};
  }
  session.metadata.lastUpdatedAt = new Date().toISOString();
}

function sanitizeSession(session: Session): Session {
  const base: Session = {
    ...session,
    startedAt: session.startedAt ?? new Date(),
    endedAt: session.endedAt ?? null,
  };

  return sanitizeForFirestore(base) as Session;
}

function ensureSessionCollections(session: Session) {
  if (!session.data) {
    session.data = {
      questions: [],
      answers: [],
      results: [],
    } as Session['data'];
  }

  if (!Array.isArray(session.data.questions)) {
    session.data.questions = [];
  }

  if (!Array.isArray(session.data.answers)) {
    session.data.answers = [];
  }

  if (!Array.isArray(session.data.results)) {
    session.data.results = [];
  }
}

function hasAnswerValue(value: AnswerValue | null | undefined): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return false;
}

function applyAnswersToSession(session: Session, answers: Record<string, AnswerValue>) {
  ensureSessionCollections(session);

  const questions = session.data.questions as Question[];
  const answerList = session.data.answers ?? [];
  let updatedResults = session.data.results ?? [];
  const now = new Date();

  Object.entries(answers).forEach(([questionId, value]) => {
    const questionIndex = questions.findIndex(question => question.id === questionId);
    if (questionIndex >= 0) {
      const question = questions[questionIndex];
      questions[questionIndex] = {
        ...question,
        answer: value ?? null,
        answered: hasAnswerValue(value),
        lastSubmittedAt: now.toISOString(),
      } as Question;
    }

    const existingAnswerIndex = answerList.findIndex(answer => answer.questionId === questionId);
    if (value === null) {
      if (existingAnswerIndex >= 0) {
        answerList.splice(existingAnswerIndex, 1);
      }
    } else if (existingAnswerIndex >= 0) {
      answerList[existingAnswerIndex] = {
        ...answerList[existingAnswerIndex],
        answer: value,
        timestamp: now,
        attempts: (answerList[existingAnswerIndex].attempts ?? 0) + 1,
      };
    } else {
      answerList.push({
        questionId,
        answer: value,
        timeSpent: 0,
        attempts: 1,
        hintsUsed: 0,
        timestamp: now,
      });
    }

    updatedResults = updatedResults.filter(result => result.questionId !== questionId);
    session.data.lastAnsweredQuestion = questionId;
  });

  session.data.answers = answerList;
  session.data.questions = ensureQuestionIdentifiers(questions);
  session.data.results = updatedResults;
}

function ensureQuestionIdentifiers(questions: Question[]): Question[] {
  return questions.map(question => {
    const hasId = typeof question.id === 'string' && question.id.trim().length > 0;
    if (hasId) {
      return question;
    }
    return {
      ...question,
      id: generateUUID(),
    };
  });
}

function normaliseAnsweredFlag(question: Question): Question {
  if ('answered' in question) {
    return question;
  }
  const value = (question as any).answer;
  const answered =
    value !== undefined &&
    value !== null &&
    !(
      typeof value === 'string' &&
      value.trim().length === 0
    ) &&
    !(
      Array.isArray(value) &&
      value.length === 0
    );

  return {
    ...question,
    answer: value !== undefined ? value : null,
    answered,
  };
}

export async function createSession(
  userId: string,
  type: SessionTypeEnum,
  metadata?: Record<string, any>
): Promise<Session> {
  const sessionId = generateUUID();
  const now = new Date();
  const data = initializeSessionData(type);

  const session: Session = {
    id: sessionId,
    userId,
    type,
    status: 'active',
    startedAt: now,
    duration: 0,
    metadata: {
      ...metadata,
      activeView: 'fragen',
      activeQuestionId: null,
      lastUpdatedAt: now.toISOString(),
    },
    data: {
      ...data,
      questions: [],
      answers: [],
      results: [],
    },
  };

  await saveSession(session);

  await generateQuestionsForSession(sessionId, userId);

  return await getSessionForUser(sessionId, userId);
}

export async function getSessionForUser(
  sessionId: string,
  userId: string
): Promise<Session> {
  return loadSessionForUser(sessionId, userId);
}

export async function getSessionQuestions(
  sessionId: string,
  userId: string
): Promise<Question[]> {
  const session = await loadSessionForUser(sessionId, userId);
  if (!Array.isArray(session.data?.questions)) {
    return [];
  }
  return session.data.questions.map(question =>
    normaliseAnsweredFlag(question)
  );
}

export async function updateSessionForUser(
  sessionId: string,
  userId: string,
  updates: UpdateSessionInput
): Promise<Session> {
  const session = await loadSessionForUser(sessionId, userId);
  ensureSessionCollections(session);

  if (updates.answers && Object.keys(updates.answers).length > 0) {
    applyAnswersToSession(session, updates.answers);
  }

  if (updates.data) {
    const { questions, answers, results, ...rest } = updates.data;
    if (rest && Object.keys(rest).length > 0) {
      session.data = {
        ...session.data,
        ...rest,
      };
    }

    if (Array.isArray(results) && results.length > 0) {
      session.data.results = results;
    }

    if (Array.isArray(answers) && answers.length > 0) {
      session.data.answers = answers;
    }

    if (Array.isArray(questions) && questions.length > 0) {
      session.data.questions = ensureQuestionIdentifiers(
        questions.map(normaliseAnsweredFlag)
      );
    }
  }

  if (updates.metadata) {
    session.metadata = {
      ...session.metadata,
      ...updates.metadata,
    };
  }

  if (typeof updates.duration === 'number') {
    session.duration = updates.duration;
  }

  if (updates.status) {
    session.status = updates.status;
  }

  touchSession(session);
  await persistSession(session);
  return sanitizeSession(session);
}

async function generateTeilQuestions(
  sessionType: SessionTypeEnum,
  questionType: QuestionTypeName,
  difficulty: QuestionDifficulty,
  teilNumber: number
): Promise<Question[]> {
  const rawQuestions = await generateSessionQuestion(
    sessionType,
    difficulty,
    questionType
  );

  return ensureQuestionIdentifiers(
    rawQuestions.map((question: any, index: number) => ({
      ...question,
      answer: question.answer ?? null,
      teil: teilNumber,
      order: index,
      registryType: questionType,
      answered: !!question.answer,
    }))
  );
}

export async function generateQuestionsForSession(
  sessionId: string,
  userId: string
): Promise<Question[]> {
  const session = await loadSessionForUser(sessionId, userId);
  const sessionType = session.type as SessionTypeEnum;
  const config = getSessionConfig(sessionType);
  const difficulty =
    (session.metadata?.difficulty as QuestionDifficulty | undefined) ??
    QuestionDifficulty.INTERMEDIATE;

  const layout = getSessionLayout(sessionType);
  const plan = layout.length
    ? layout
    : getSupportedQuestionTypes(sessionType);

  if (!plan.length) {
    throw new Error(`No question types registered for session type "${sessionType}"`);
  }

  const generated: Question[] = [];
  let teilNumber = 1;

  for (const questionType of plan) {
    const teilQuestions = await generateTeilQuestions(
      sessionType,
      questionType,
      difficulty,
      teilNumber
    );
    if (teilQuestions.length > 0) {
      generated.push(...teilQuestions);
      teilNumber += 1;
    }
  }

  const questionsWithFlags = generated.map(normaliseAnsweredFlag);

  ensureSessionCollections(session);

  session.data.questions = ensureQuestionIdentifiers(questionsWithFlags);
  session.data.answers = [];
  session.data.results = [];
  session.metadata = {
    ...session.metadata,
    config: {
      displayName: config.metadata.displayName,
      icon: config.metadata.icon,
      color: config.metadata.color,
    },
    activeQuestionId: questionsWithFlags[0]?.id ?? null,
    lastUpdatedAt: new Date().toISOString(),
  };

  touchSession(session);
  await persistSession(session);
  return session.data.questions;
}

function mapManagerStateToSession(
  session: Session,
  state: ReturnType<QuestionManager['getState']>,
  lastAnsweredId: string | null
) {
  ensureSessionCollections(session);
  const answerIndex = new Map(
    state.answers.map(answer => [answer.questionId, answer])
  );

  const totalScore = state.results.reduce((sum, item) => sum + item.score, 0);
  const maxPossibleScore = state.questions.reduce(
    (sum, item) => sum + (item.points ?? 0),
    0
  );
  const correctAnswers = state.results.filter(result => result.isCorrect).length;
  const incorrectAnswers = state.results.filter(
    result => !result.isCorrect && result.markedBy !== 'manual'
  ).length;

  const timestamp = new Date().toISOString();

  session.data.questions = ensureQuestionIdentifiers(state.questions.map(question => {
    const answer = answerIndex.get(question.id);
    const hasAnswer = !!answer;

    return {
      ...question,
      answer: answer?.answer ?? (question as any).answer ?? null,
      answered: hasAnswer || !!question.answered,
      lastSubmittedAt:
        hasAnswer || question.id === lastAnsweredId
          ? timestamp
          : (question as any).lastSubmittedAt,
    } as Question;
  }));

  session.data.answers = state.answers;
  session.data.results = state.results;
  session.data.currentScore = totalScore;
  session.data.maxPossibleScore = maxPossibleScore;
  session.data.questionsAnswered = state.answers.length;
  session.data.questionsCorrect = correctAnswers;
  session.data.questionsIncorrect = incorrectAnswers;

  if (lastAnsweredId) {
    session.data.lastAnsweredQuestion = lastAnsweredId;
  }
}

export async function submitAnswerForSession(
  sessionId: string,
  userId: string,
  payload: SubmitAnswerPayload
): Promise<QuestionResult> {
  const session = await loadSessionForUser(sessionId, userId);
  if (!Array.isArray(session.data?.questions) || session.data.questions.length === 0) {
    throw new Error('Session questions not initialised');
  }

  const manager = new QuestionManager(
    session.data.questions,
    session.data.answers ?? [],
    session.data.results ?? []
  );

  const result = await manager.submitAnswer(
    payload.questionId,
    payload.answer,
    payload.timeSpent,
    payload.hintsUsed
  );

  mapManagerStateToSession(session, manager.getState(), payload.questionId);
  touchSession(session);
  await persistSession(session);

  return result;
}

export async function submitAnswersBulkForSession(
  sessionId: string,
  userId: string,
  answers: SubmitAnswerPayload[]
): Promise<QuestionResult[]> {
  throw Object.assign(
    new Error('Bulk marking route is deprecated; use completeSessionForUser'),
    { statusCode: 410 }
  );
}

export async function completeSessionForUser(
  sessionId: string,
  userId: string
): Promise<CompletionSummary> {
  const session = await loadSessionForUser(sessionId, userId);
  if (!Array.isArray(session.data?.questions) || session.data.questions.length === 0) {
    throw new Error('Session questions not initialised');
  }

  ensureSessionCollections(session);

  const manager = new QuestionManager(
    session.data.questions,
    session.data.answers ?? [],
    session.data.results ?? []
  );

  const outcome = await manager.finaliseSession();

  session.data.questions = ensureQuestionIdentifiers(
    outcome.results.map(result => ({
      ...result.question,
      answer: result.userAnswer.answer,
      answered: true,
      lastSubmittedAt: new Date().toISOString(),
    }))
  );
  session.data.answers = manager.getUserAnswers();
  session.data.results = manager.getQuestionResults();
  session.data.currentScore = outcome.summary.totalScore;
  session.data.maxPossibleScore = outcome.summary.maxScore;
  session.data.questionsAnswered = outcome.summary.answeredQuestions;
  session.data.questionsCorrect = outcome.summary.correctAnswers;
  session.data.questionsIncorrect = outcome.summary.incorrectAnswers;
  session.data.completedAt = new Date().toISOString();

  touchSession(session);
  await persistSession(session);

  return {
    results: outcome.results,
    summary: outcome.summary,
  };
}

export async function endSessionForUser(
  sessionId: string,
  userId: string,
  status: SessionStatus
): Promise<Session> {
  const session = await loadSessionForUser(sessionId, userId);
  session.status = status;
  session.endedAt = new Date();
  touchSession(session);
  await persistSession(session);
  return session;
}
