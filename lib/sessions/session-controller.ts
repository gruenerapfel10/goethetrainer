import { generateUUID } from '@/lib/utils';
import type {
  CompletionSummary,
  Session,
  SessionStatus,
  SubmitAnswerPayload,
  UpdateSessionInput,
  AnswerValue,
} from './types';
import type { Question, QuestionResult } from './questions/question-types';
import {
  SessionTypeEnum,
  getSessionConfig,
  getSessionLayout,
  getSupportedQuestionTypes,
  initializeSessionData,
} from './session-registry';
import { QuestionTypeName } from './questions/question-registry';
import './configs';
import { generateSessionQuestion } from './questions/standard-generator';
import { QuestionDifficulty } from './questions/question-types';
import {
  loadSessionForUser,
  persistSession,
  saveSessionRecord,
  touchSession,
  ensureSessionCollections,
} from './session-store';
import {
  applyAnswersToSession,
  ensureQuestionIdentifiers,
  normaliseAnsweredFlag,
} from './session-answers';
import { finaliseSession, gradeAnswer } from './session-grading';

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
      inputType: question.inputType ?? question.answerType,
      answerType: question.answerType ?? question.inputType,
    }))
  );
}

export async function createSession(
  userId: string,
  type: SessionTypeEnum,
  metadata?: Record<string, any>
): Promise<Session> {
  const sessionId = generateUUID();
  const now = new Date();
  const config = getSessionConfig(type);
  const data = initializeSessionData(type);

  const session: Session = {
    id: sessionId,
    userId,
    type,
    status: 'active',
    startedAt: now,
    duration: 0,
    metadata: {
      ...(config.metadataDefaults ?? {}),
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

  await saveSessionRecord(session);
  await generateQuestionsForSession(sessionId, userId);
  return loadSessionForUser(sessionId, userId);
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

    if (Array.isArray(results)) {
      session.data.results = results;
    }

    if (Array.isArray(answers)) {
      session.data.answers = answers;
    }

    if (Array.isArray(questions)) {
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
  return persistSession(session);
}

export async function generateQuestionsForSession(
  sessionId: string,
  userId: string
): Promise<Question[]> {
  const session = await loadSessionForUser(sessionId, userId);
  ensureSessionCollections(session);

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

  session.data.questions = ensureQuestionIdentifiers(questionsWithFlags);
  session.data.answers = [];
  session.data.results = [];
  session.data.progress = {
    totalQuestions: session.data.questions.length,
    answeredQuestions: 0,
    correctAnswers: 0,
    score: 0,
    maxScore: session.data.questions.reduce(
      (sum, question) => sum + (question.points ?? 0),
      0
    ),
  };
  session.data.metrics = {
    ...(session.data.metrics ?? {}),
    totalQuestions: session.data.progress.totalQuestions,
    answeredQuestions: 0,
    correctAnswers: 0,
    score: 0,
    maxScore: session.data.progress.maxScore,
  };
  session.data.state = {
    ...(session.data.state ?? {}),
    activeQuestionId: session.data.questions[0]?.id ?? null,
    activeTeil: (session.data.questions[0]?.teil ?? null) as number | null,
    activeView: (session.metadata?.activeView ?? 'fragen') as 'fragen' | 'quelle' | 'overview',
  };
  session.metadata = {
    ...session.metadata,
    config: {
      displayName: config.metadata.displayName,
      icon: config.metadata.icon,
      color: config.metadata.color,
    },
    activeQuestionId: session.data.questions[0]?.id ?? null,
    lastUpdatedAt: new Date().toISOString(),
  };

  touchSession(session);
  await persistSession(session);
  return session.data.questions;
}

export async function submitAnswerForSession(
  sessionId: string,
  userId: string,
  payload: SubmitAnswerPayload
): Promise<QuestionResult> {
  const session = await loadSessionForUser(sessionId, userId);
  const result = await gradeAnswer(session, payload);
  await persistSession(session);
  return result;
}

export async function submitAnswersBulkForSession(
  _sessionId: string,
  _userId: string,
  _answers: Array<{
    questionId: string;
    answer: AnswerValue;
    timeSpent: number;
    hintsUsed: number;
  }>
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
  const outcome = await finaliseSession(session);
  await persistSession(session);
  return outcome;
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
  return persistSession(session);
}
