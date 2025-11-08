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
  initializeSessionData,
  type NormalisedSessionLayoutEntry,
} from './session-registry';
import './configs';
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
import {
  executeQuestionModuleTask,
  registerDefaultQuestionModules,
} from '@/lib/questions/modules';
import type { QuestionModuleTask } from '@/lib/questions/modules/types';

registerDefaultQuestionModules();

async function generateTeilQuestions(
  sessionType: SessionTypeEnum,
  layoutEntry: NormalisedSessionLayoutEntry,
  difficulty: QuestionDifficulty,
  teilNumber: number
): Promise<Question[]> {
  const task: QuestionModuleTask = {
    id: layoutEntry.id,
    label: layoutEntry.label,
    moduleId: layoutEntry.moduleId,
    questionCount: layoutEntry.questionCount ?? 0,
    promptOverrides: layoutEntry.promptOverrides,
    renderOverrides: layoutEntry.renderOverrides,
    sourceOverrides: layoutEntry.sourceOverrides,
    scoringOverrides: layoutEntry.scoringOverrides,
    metadata: layoutEntry.metadata,
  };

  const { questions: rawQuestions } = await executeQuestionModuleTask(task, {
    sessionType,
    difficulty,
  });

  let questions = rawQuestions.map((question: any, index: number) => ({
    ...question,
    answer: question.answer ?? null,
    teil: teilNumber,
    order: index,
    registryType: layoutEntry.moduleId,
    answered: !!question.answer,
    inputType: question.inputType ?? question.answerType,
    answerType: question.answerType ?? question.inputType,
    layoutId: layoutEntry.id,
    layoutLabel: layoutEntry.label,
  }));

  const pointsOverride = layoutEntry.metadata?.points;
  if (typeof pointsOverride === 'number' && Number.isFinite(pointsOverride) && pointsOverride > 0) {
    const totalPoints = Math.max(0, Math.round(pointsOverride));

    const scoredQuestions = questions.filter(question => !question.isExample);
    const scoredCount = scoredQuestions.length;

    const scaleRubric = (question: Question, targetPoints: number): Question => {
      const next: Question = {
        ...question,
        points: targetPoints,
      };

      if (Array.isArray(next.scoringRubric) && next.scoringRubric.length > 0) {
        const rubricTotal = next.scoringRubric.reduce(
          (sum, entry) => sum + (entry.maxPoints ?? 0),
          0
        );

        if (rubricTotal > 0) {
          const scale = targetPoints / rubricTotal;
          const scaledRubric = next.scoringRubric.map(entry => ({
            ...entry,
            maxPoints: Math.max(0, Math.round((entry.maxPoints ?? 0) * scale)),
          }));

          const scaledTotal = scaledRubric.reduce(
            (sum, entry) => sum + (entry.maxPoints ?? 0),
            0
          );
          const delta = targetPoints - scaledTotal;
          if (scaledRubric.length > 0 && delta !== 0) {
            scaledRubric[0] = {
              ...scaledRubric[0],
              maxPoints: (scaledRubric[0].maxPoints ?? 0) + delta,
            };
          }

          next.scoringRubric = scaledRubric;
        }
      }

      return next;
    };

    if (scoredCount > 0) {
      const basePointValue = Math.floor(totalPoints / scoredCount);
      let remainder = totalPoints - basePointValue * scoredCount;

      let scoredIndex = 0;
      questions = questions.map(question => {
        if (question.isExample) {
          return scaleRubric(question, 0);
        }

        const extra = remainder > 0 ? 1 : 0;
        if (extra > 0) {
          remainder -= 1;
        }

        const targetPoints = basePointValue + extra;
        const scaled = scaleRubric(question, targetPoints);
        scoredIndex += 1;
        return scaled;
      });
    } else {
      questions = questions.map(question => scaleRubric(question, totalPoints));
    }
  }

  return ensureQuestionIdentifiers(questions);
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
      config: {
        displayName: config.metadata.displayName,
        icon: config.metadata.icon,
        color: config.metadata.color,
      },
      lastUpdatedAt: now.toISOString(),
    },
    data: {
      ...data,
      questions: [],
      answers: [],
      results: [],
      generation: {
        status: 'in_progress',
        total: 0,
        generated: 0,
        currentTeil: null,
        startedAt: now.toISOString(),
      },
    },
  };

  await saveSessionRecord(session);
  void generateQuestionsForSession(sessionId, userId, { awaitCompletion: false });
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

interface GenerateQuestionsOptions {
  awaitCompletion?: boolean;
  regenerate?: boolean;
}

export async function generateQuestionsForSession(
  sessionId: string,
  userId: string,
  options: GenerateQuestionsOptions = {}
): Promise<Question[]> {
  const { awaitCompletion = true, regenerate = true } = options;

  const run = async () => {
    const session = await loadSessionForUser(sessionId, userId);
    ensureSessionCollections(session);

    const sessionType = session.type as SessionTypeEnum;
    const config = getSessionConfig(sessionType);
    const difficulty =
      (session.metadata?.difficulty as QuestionDifficulty | undefined) ??
      QuestionDifficulty.INTERMEDIATE;

    const plan = getSessionLayout(sessionType);

    if (!plan.length) {
      throw new Error(`No question layout defined for session type "${sessionType}"`);
    }

    if (regenerate) {
      session.data.questions = [];
      session.data.answers = [];
      session.data.results = [];
      session.data.progress = {
        totalQuestions: 0,
        answeredQuestions: 0,
        correctAnswers: 0,
        score: 0,
        maxScore: 0,
      };
      session.data.metrics = {
        ...(session.data.metrics ?? {}),
        totalQuestions: 0,
        answeredQuestions: 0,
        correctAnswers: 0,
        score: 0,
        maxScore: 0,
      };
      session.data.state = {
        ...(session.data.state ?? {}),
        activeQuestionId: null,
        activeTeil: null,
        activeView: (session.metadata?.activeView ?? 'fragen') as 'fragen' | 'quelle' | 'overview',
      };
    }

    session.metadata = {
      ...session.metadata,
      config: {
        displayName: config.metadata.displayName,
        icon: config.metadata.icon,
        color: config.metadata.color,
      },
    };

    session.data.generation = {
      status: 'in_progress',
      total: session.data.generation?.total ?? 0,
      generated: session.data.generation?.generated ?? 0,
      currentTeil: session.data.generation?.currentTeil ?? null,
      startedAt: session.data.generation?.startedAt ?? new Date().toISOString(),
      error: undefined,
      completedAt: undefined,
      lastGeneratedQuestionId: session.data.generation?.lastGeneratedQuestionId,
    };

    touchSession(session);
    await persistSession(session);

    let teilNumber = 1;
    let maxScore = session.data.progress?.maxScore ?? 0;

    const appendQuestion = async (question: Question) => {
      const normalised = normaliseAnsweredFlag(question);
      session.data.questions.push(normalised);
      session.data.questions = ensureQuestionIdentifiers(session.data.questions);

      maxScore += normalised.points ?? 0;

      const answerList = session.data.answers ?? [];
      const resultList = session.data.results ?? [];
      const correctCount = resultList.filter(result => result.isCorrect).length;
      const scoreSum = resultList.reduce(
        (sum, result) => sum + (result.score ?? 0),
        0
      );

      session.data.progress = {
        ...session.data.progress,
        totalQuestions: session.data.questions.length,
        answeredQuestions: answerList.length,
        correctAnswers: correctCount,
        score: scoreSum,
        maxScore,
      };

      session.data.metrics = {
        ...(session.data.metrics ?? {}),
        totalQuestions: session.data.questions.length,
        answeredQuestions: answerList.length,
        correctAnswers: correctCount,
        score: scoreSum,
        maxScore,
      };

      const state = session.data.state ?? { activeQuestionId: null, activeTeil: null, activeView: 'fragen' as const };
      if (!state.activeQuestionId) {
        state.activeQuestionId = normalised.id;
        state.activeTeil = normalised.teil ?? teilNumber;
        session.data.state = state;
        if (session.metadata) {
          session.metadata.activeQuestionId = normalised.id;
        }
      }

      session.data.generation = {
        ...(session.data.generation ?? {
          status: 'in_progress',
          total: 0,
          generated: 0,
        }),
        status: 'in_progress',
        generated: (session.data.generation?.generated ?? 0) + 1,
        lastGeneratedQuestionId: normalised.id,
        currentTeil: normalised.teil ?? teilNumber,
      };

      touchSession(session);
      await persistSession(session);
    };

    try {
      for (const layoutEntry of plan) {
        const teilQuestions = await generateTeilQuestions(
          sessionType,
          layoutEntry,
          difficulty,
          teilNumber
        );

        if (!teilQuestions.length) {
          teilNumber += 1;
          continue;
        }

        session.data.generation = {
          ...(session.data.generation ?? {
            status: 'in_progress',
            total: 0,
            generated: 0,
          }),
          status: 'in_progress',
          total: (session.data.generation?.total ?? 0) + teilQuestions.length,
          currentTeil: teilNumber,
        };
        touchSession(session);
        await persistSession(session);

        for (const question of teilQuestions) {
          await appendQuestion(question);
        }

        teilNumber += 1;
      }

      session.data.generation = {
        ...(session.data.generation ?? {
          status: 'completed',
          total: session.data.questions.length,
          generated: session.data.questions.length,
        }),
        status: 'completed',
        total: session.data.questions.length,
        generated: session.data.questions.length,
        currentTeil: null,
        completedAt: new Date().toISOString(),
      };
      touchSession(session);
      await persistSession(session);
    } catch (error) {
      session.data.generation = {
        ...(session.data.generation ?? {
          status: 'failed',
          total: session.data.questions.length,
          generated: session.data.questions.length,
        }),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        currentTeil: null,
      };
      touchSession(session);
      await persistSession(session);
      throw error;
    }

    return session.data.questions;
  };

  if (!awaitCompletion) {
    void run().catch(error => {
      console.error('Question generation failed:', error);
    });
    const session = await loadSessionForUser(sessionId, userId);
    ensureSessionCollections(session);
    return session.data.questions;
  }

  return run();
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
