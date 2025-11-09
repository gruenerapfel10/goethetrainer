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
import type { QuestionModuleTask, ModelUsageRecord } from '@/lib/questions/modules/types';
import { calculateCost } from '@/lib/ai/model-registry';

registerDefaultQuestionModules();

function deriveExampleAnswer(question: Question): AnswerValue {
  if (typeof question.correctOptionId === 'string' && question.correctOptionId.length > 0) {
    return question.correctOptionId;
  }

  if (typeof question.correctAnswer === 'string' && question.correctAnswer.length > 0) {
    return question.correctAnswer;
  }

  if (Array.isArray(question.gaps) && question.gaps.length > 0) {
    const record: Record<string, string> = {};
    question.gaps.forEach((gap, index) => {
      const gapId = gap.id ?? `GAP_${index + 1}`;
      const value =
        gap.correctOptionId ??
        (typeof gap.correctAnswer === 'string' ? gap.correctAnswer : undefined);
      if (gapId && typeof value === 'string' && value.length > 0) {
        record[gapId] = value;
      }
    });
    return Object.keys(record).length > 0 ? record : null;
  }

  if (question.correctMatches && Object.keys(question.correctMatches).length > 0) {
    return { ...question.correctMatches };
  }

  return null;
}

function markQuestionAsExample(question: Question): Question {
  const exampleAnswer = deriveExampleAnswer(question);
  return {
    ...question,
    isExample: true,
    exampleAnswer:
      typeof exampleAnswer === 'string' ? exampleAnswer : question.exampleAnswer,
    answer: exampleAnswer ?? question.answer ?? null,
    answered: true,
    points: 0,
  };
}

interface TeilGenerationResult {
  questions: Question[];
  usage: ModelUsageRecord[];
}

const TEIL_GENERATION_MAX_ATTEMPTS = 3;

async function generateTeilQuestions(
  sessionType: SessionTypeEnum,
  layoutEntry: NormalisedSessionLayoutEntry,
  difficulty: QuestionDifficulty,
  teilNumber: number,
  userId?: string
): Promise<TeilGenerationResult> {
  const exampleRequested = layoutEntry.generateExample === true;
  const baseQuestionCount = layoutEntry.questionCount;
  const requestedQuestionCount =
    typeof baseQuestionCount === 'number'
      ? baseQuestionCount + (exampleRequested ? 1 : 0)
      : baseQuestionCount;

  const task: QuestionModuleTask = {
    id: layoutEntry.id,
    label: layoutEntry.label,
    moduleId: layoutEntry.moduleId,
    questionCount: requestedQuestionCount ?? 0,
    promptOverrides: layoutEntry.promptOverrides,
    renderOverrides: layoutEntry.renderOverrides,
    sourceOverrides: {
      ...(layoutEntry.sourceOverrides ?? {}),
      teilLabel: layoutEntry.label ?? `Teil ${teilNumber}`,
    },
    scoringOverrides: layoutEntry.scoringOverrides,
    metadata: layoutEntry.metadata,
  };

  const usageRecords: ModelUsageRecord[] = [];

  let attempt = 0;
  let lastError: unknown = null;
  while (attempt < TEIL_GENERATION_MAX_ATTEMPTS) {
    attempt += 1;
    try {
      console.log(
        `[SessionGenerator] Teil ${teilNumber} (${layoutEntry.moduleId}) attempt ${attempt}/${TEIL_GENERATION_MAX_ATTEMPTS}`
      );
      const { questions: rawQuestions } = await executeQuestionModuleTask(task, {
        sessionType,
        difficulty,
        userId,
        recordUsage: record => {
          usageRecords.push(record);
        },
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

      if (exampleRequested && questions.length > 0) {
        const [exampleQuestion, ...restQuestions] = questions;
        const updatedExample = markQuestionAsExample(exampleQuestion);
        questions = [updatedExample, ...restQuestions];
      }

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

      return {
        questions: ensureQuestionIdentifiers(questions),
        usage: usageRecords,
      };
    } catch (error) {
      lastError = error;
      console.error(
        `[SessionGenerator] Teil ${teilNumber} (${layoutEntry.moduleId}) attempt ${attempt} failed`,
        error
      );
      if (attempt >= TEIL_GENERATION_MAX_ATTEMPTS) {
        break;
      }
      usageRecords.length = 0;
    }
  }

  throw lastError ?? new Error(`Teil ${teilNumber} generation failed`);
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
    const {
      questions,
      answers,
      results,
      state,
      progress,
      metrics,
      ...rest
    } = updates.data;

    const nextData = { ...session.data };

    if (rest && Object.keys(rest).length > 0) {
      Object.assign(nextData, rest);
    }

    if (Array.isArray(results)) {
      nextData.results = results;
    }

    if (Array.isArray(answers)) {
      nextData.answers = answers;
    }

    if (Array.isArray(questions)) {
      nextData.questions = ensureQuestionIdentifiers(
        questions.map(normaliseAnsweredFlag)
      );
    }

    if (state) {
      nextData.state = {
        ...(nextData.state ?? {
          activeQuestionId: null,
          activeTeil: null,
          activeView: 'fragen',
        }),
        ...state,
      };
      if (nextData.state.activeQuestionId && session.metadata) {
        session.metadata.activeQuestionId = nextData.state.activeQuestionId;
      }
      if (nextData.state.activeView && session.metadata) {
        session.metadata.activeView = nextData.state.activeView;
      }
    }

    if (progress) {
      nextData.progress = {
        ...(nextData.progress ?? {
          totalQuestions: 0,
          answeredQuestions: 0,
          correctAnswers: 0,
          score: 0,
          maxScore: 0,
        }),
        ...progress,
      };
    }

    if (metrics) {
      nextData.metrics = {
        ...(nextData.metrics ?? {}),
        ...metrics,
      };
    }

    session.data = nextData;
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

    let fallbackTeilNumber = 1;
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
        state.activeTeil = normalised.teil ?? fallbackTeilNumber;
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
        currentTeil: normalised.teil ?? fallbackTeilNumber,
      };

      touchSession(session);
      await persistSession(session);
    };

    type PendingTeil = {
      entry: NormalisedSessionLayoutEntry;
      result: TeilGenerationResult;
      startedAt: number;
      finishedAt: number;
    };

    const pendingTeils = new Map<number, PendingTeil>();
    let nextPlanIndex = 0;
    let nextTeilToFlush = 1;
    let workerError: unknown = null;
    let flushLock: Promise<void> | null = null;

    const logUsage = (teilNumberToLog: number, usage: ModelUsageRecord[], durationMs: number) => {
      if (usage.length) {
        const inputTokens = usage.reduce<number>((sum, record) => sum + record.inputTokens, 0);
        const outputTokens = usage.reduce<number>((sum, record) => sum + record.outputTokens, 0);
        const estimatedCost = usage.reduce<number>((sum, record) => {
          const cost = calculateCost(record.modelId, record.inputTokens, record.outputTokens);
          return sum + (cost ?? 0);
        }, 0);
        console.log(
          `[SessionGenerator] Teil ${teilNumberToLog} finished in ${(durationMs / 1000).toFixed(2)}s | input=${inputTokens} output=${outputTokens} tokens | approx cost=$${estimatedCost.toFixed(4)}`
        );
      } else {
        console.log(`[SessionGenerator] Teil ${teilNumberToLog} finished with no usage metrics (duration ${(durationMs / 1000).toFixed(2)}s)`);
      }
    };

    const processTeilResult = async (
      targetTeilNumber: number,
      payload: PendingTeil
    ) => {
      const { entry, result, startedAt, finishedAt } = payload;
      const teilQuestions = result.questions;
      if (!teilQuestions.length) {
        console.warn(`[SessionGenerator] Teil ${targetTeilNumber} returned no questions`);
        return;
      }

      logUsage(targetTeilNumber, result.usage, finishedAt - startedAt);

      session.data.generation = {
        ...(session.data.generation ?? {
          status: 'in_progress',
          total: 0,
          generated: 0,
        }),
        status: 'in_progress',
        total: (session.data.generation?.total ?? 0) + teilQuestions.length,
        currentTeil: targetTeilNumber,
      };
      touchSession(session);
      await persistSession(session);

      for (const question of teilQuestions) {
        await appendQuestion(question);
      }

      console.log(
        `[SessionGenerator] Teil ${targetTeilNumber} persisted (${teilQuestions.length} questions, total=${session.data.questions.length})`
      );
      fallbackTeilNumber = targetTeilNumber + 1;
    };

    const flushReadyTeils = async (): Promise<void> => {
      if (flushLock) {
        await flushLock;
        // Another worker may have queued ready teils while we were waiting.
        return flushReadyTeils();
      }

      if (!pendingTeils.has(nextTeilToFlush)) {
        return;
      }

      flushLock = (async () => {
        try {
          while (pendingTeils.has(nextTeilToFlush)) {
            console.log(`[SessionGenerator] Flushing queued Teil ${nextTeilToFlush}`);
            const payload = pendingTeils.get(nextTeilToFlush)!;
            pendingTeils.delete(nextTeilToFlush);
            await processTeilResult(nextTeilToFlush, payload);
            nextTeilToFlush += 1;
          }
          console.log('[SessionGenerator] Flush run complete');
        } finally {
          flushLock = null;
        }
      })();

      await flushLock;

      if (pendingTeils.has(nextTeilToFlush)) {
        await flushReadyTeils();
      }
    };

    const getNextPlanIndex = () => {
      if (nextPlanIndex >= plan.length) {
        return null;
      }
      const index = nextPlanIndex;
      nextPlanIndex += 1;
      return index;
    };

    const worker = async (workerId: number) => {
      while (true) {
        if (workerError) {
          return;
        }
        const planIndex = getNextPlanIndex();
        if (planIndex === null) {
          return;
        }
        const currentTeil = planIndex + 1;
        const entry = plan[planIndex];
        console.log(`[SessionGenerator] Worker ${workerId} dispatch Teil ${currentTeil} (${entry.moduleId})`);
        const startTime = Date.now();
        try {
          const result = await generateTeilQuestions(
            sessionType,
            entry,
            difficulty,
            currentTeil,
            userId
          );
          console.log(
            `[SessionGenerator] Worker ${workerId} completed Teil ${currentTeil} (questions=${result.questions.length})`
          );
          pendingTeils.set(currentTeil, {
            entry,
            result,
            startedAt: startTime,
            finishedAt: Date.now(),
          });
          await flushReadyTeils();
        } catch (error) {
          workerError = error;
          console.error(`[SessionGenerator] Worker ${workerId} failed on Teil ${currentTeil}`, error);
          return;
        }
      }
    };

    try {
      const remainingPlanLength = plan.length - nextPlanIndex;
      if (remainingPlanLength > 0) {
        const concurrency = Math.min(4, remainingPlanLength);
        console.log(
          `[SessionGenerator] Starting worker pool with ${concurrency} workers for ${remainingPlanLength} teils`
        );
        const workers = Array.from({ length: concurrency }, (_, idx) => worker(idx + 1));
        await Promise.all(workers);
        await flushReadyTeils();
      }

      if (workerError) {
        throw workerError;
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
  console.log('[session-controller] completeSession', sessionId, {
    results: session.data?.results?.length ?? 0,
    questions: session.data?.questions?.length ?? 0,
  });
  await persistSession(session);
  return outcome;
}

export async function endSessionForUser(
  sessionId: string,
  userId: string,
  status: SessionStatus
): Promise<Session> {
  const session = await loadSessionForUser(sessionId, userId);
  if (status === 'completed') {
    const alreadyCompleted =
      session.status === 'completed' &&
      Array.isArray(session.data?.results) &&
      session.data.results.length > 0;
    if (!alreadyCompleted) {
      try {
        await finaliseSession(session);
        console.log('[session-controller] endSession finalise', sessionId, {
          results: session.data?.results?.length ?? 0,
          questions: session.data?.questions?.length ?? 0,
        });
      } catch (error) {
        console.error('Failed to finalise session before ending', error);
      }
    }
  }
  session.status = status;
  session.endedAt = new Date();
  touchSession(session);
  return persistSession(session);
}
