import { markQuestion, markQuestions } from './questions/question-marker';
import type { Question, QuestionResult, UserAnswer } from './questions/question-types';
import type {
  AnswerValue,
  ModuleBreakdownEntry,
  SessionType,
  TeilBreakdownEntry,
} from './types';
import { SessionTypeEnum } from './session-registry';
import { QuestionModuleId } from '@/lib/questions/modules/types';

export interface QuestionManagerState {
  questions: Question[];
  answers: UserAnswer[];
  results: QuestionResult[];
}

export interface QuestionSessionSummary {
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  pendingManualReview: number;
  aiMarkedCount: number;
  automaticMarkedCount: number;
  teilBreakdown: TeilBreakdownEntry[];
  moduleBreakdown: ModuleBreakdownEntry[];
}

export interface QuestionSessionOutcome {
  results: QuestionResult[];
  summary: QuestionSessionSummary;
}

function cloneQuestion(question: Question): Question {
  return JSON.parse(JSON.stringify(question));
}

function cloneAnswer(answer: UserAnswer): UserAnswer {
  return {
    ...answer,
    timestamp: new Date(answer.timestamp),
  };
}

function cloneResult(result: QuestionResult): QuestionResult {
  return {
    ...result,
    question: cloneQuestion(result.question),
    userAnswer: cloneAnswer(result.userAnswer),
  };
}

const MODULE_TARGET_POINTS: Record<SessionTypeEnum, number> = {
  [SessionTypeEnum.READING]: 25,
  [SessionTypeEnum.LISTENING]: 25,
  [SessionTypeEnum.WRITING]: 25,
  [SessionTypeEnum.SPEAKING]: 25,
};

const MODULE_ORDER: SessionTypeEnum[] = [
  SessionTypeEnum.READING,
  SessionTypeEnum.LISTENING,
  SessionTypeEnum.WRITING,
  SessionTypeEnum.SPEAKING,
];

const MODULE_LABELS: Record<SessionTypeEnum, string> = {
  [SessionTypeEnum.READING]: 'Lesen',
  [SessionTypeEnum.LISTENING]: 'Hören',
  [SessionTypeEnum.WRITING]: 'Schreiben',
  [SessionTypeEnum.SPEAKING]: 'Sprechen',
};

function isStatementMatchQuestion(question: Question): boolean {
  const moduleId = (question.moduleId ?? question.registryType) as QuestionModuleId | undefined;
  return moduleId === QuestionModuleId.STATEMENT_MATCH;
}

function getUnitCount(question: Question): number {
  if (isStatementMatchQuestion(question)) {
    const statementCount = question.statements?.length ?? 0;
    if (statementCount > 0) {
      return statementCount;
    }
    if (typeof question.points === 'number' && question.points > 0) {
      return Math.round(question.points);
    }
  }
  return 1;
}

function hasAnswer(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

export function buildQuestionSessionSummary(
  results: QuestionResult[],
  questions: Question[]
): QuestionSessionSummary {
  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const maxScore = questions.reduce((sum, question) => sum + (question.points ?? 0), 0);

let totalUnits = 0;
let answeredUnits = 0;
let correctUnits = 0;
let incorrectUnits = 0;

results.forEach(result => {
  const question = questions.find(q => q.id === result.questionId);
  if (!question) {
    return;
  }
  const units = getUnitCount(question);
  const isStatementMatch = isStatementMatchQuestion(question);
  const correct = isStatementMatch
    ? Math.max(0, Math.min(units, Math.round(result.score ?? 0)))
    : result.isCorrect
      ? units
      : 0;
  const incorrectContribution = isStatementMatch
    ? Math.max(0, units - correct)
    : !result.isCorrect && result.markedBy !== 'manual'
      ? units
      : 0;

  totalUnits += units;
  answeredUnits += hasAnswer(result.userAnswer.answer) ? units : 0;
  correctUnits += correct;
  incorrectUnits += incorrectContribution;
});

  if (totalUnits === 0) {
    totalUnits = questions.length || 0;
    answeredUnits = results.filter(result => hasAnswer(result.userAnswer.answer)).length;
    correctUnits = results.filter(result => result.isCorrect).length;
    incorrectUnits = results.filter(result => !result.isCorrect && result.markedBy !== 'manual').length;
  }

  const totalQuestions = totalUnits;
  const answeredQuestions = answeredUnits;
  const unansweredQuestions = Math.max(0, totalUnits - answeredUnits);
  const correctAnswers = correctUnits;
  const pendingManualReview = results.filter(result => result.markedBy === 'manual').length;
  const incorrectAnswers = incorrectUnits;

  const aiMarkedCount = results.filter(result => result.markedBy === 'ai').length;
  const automaticMarkedCount = results.filter(result => result.markedBy === 'automatic').length;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const questionById = new Map(questions.map(question => [question.id, question]));
  const teilBuckets = new Map<
    number,
    {
      label: string;
      questionCount: number;
      correctAnswers: number;
      score: number;
      maxScore: number;
    }
  >();
  const moduleBuckets = new Map<
    SessionTypeEnum,
    {
      label: string;
      rawScore: number;
      rawMaxScore: number;
      questionCount: number;
    }
  >();

  results.forEach(result => {
    const question = questionById.get(result.questionId);
    if (!question) {
      return;
    }

    const teilNumber =
      typeof (question as any).teil === 'number'
        ? ((question as any).teil as number)
        : 0;
    const teilLabel =
      (question as any).layoutLabel ??
      (teilNumber > 0 ? `Teil ${teilNumber}` : 'Teil');
    const teilEntry =
      teilBuckets.get(teilNumber) ??
      {
        label: teilLabel,
        questionCount: 0,
        correctAnswers: 0,
        score: 0,
        maxScore: 0,
      };

    const units = getUnitCount(question);
    const isStatementMatch = isStatementMatchQuestion(question);
    const correctUnitContribution = isStatementMatch
      ? Math.max(0, Math.min(units, Math.round(result.score ?? 0)))
      : result.isCorrect
        ? units
        : 0;

    teilEntry.label = teilLabel;
    teilEntry.questionCount += units;
    teilEntry.maxScore += question.points ?? 0;
    teilEntry.score += result.score;
    teilEntry.correctAnswers += correctUnitContribution;
    teilBuckets.set(teilNumber, teilEntry);

    const module =
      (question.sessionType as SessionTypeEnum) ?? SessionTypeEnum.READING;
    const moduleLabel = MODULE_LABELS[module] ?? module;
    const moduleEntry =
      moduleBuckets.get(module) ??
      {
        label: moduleLabel,
        rawScore: 0,
        rawMaxScore: 0,
        questionCount: 0,
      };

    moduleEntry.label = moduleLabel;
    moduleEntry.rawScore += result.score;
    moduleEntry.rawMaxScore += question.points ?? 0;
    moduleEntry.questionCount += units;
    moduleBuckets.set(module, moduleEntry);
  });

  const teilBreakdown: TeilBreakdownEntry[] = Array.from(teilBuckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([teilNumber, bucket]) => ({
      teilNumber,
      label: bucket.label,
      questionCount: bucket.questionCount,
      correctAnswers: bucket.correctAnswers,
      score: bucket.score,
      maxScore: bucket.maxScore,
      percentage: bucket.maxScore > 0 ? Math.round((bucket.score / bucket.maxScore) * 100) : 0,
    }));

  const moduleBreakdown: ModuleBreakdownEntry[] = MODULE_ORDER.map(module => {
    const bucket = moduleBuckets.get(module);
    const rawScore = bucket?.rawScore ?? 0;
    const rawMaxScore = bucket?.rawMaxScore ?? 0;
    const scaledMaxScore = MODULE_TARGET_POINTS[module] ?? rawMaxScore;
    const scaledScore =
      rawMaxScore > 0
        ? Math.round((rawScore / rawMaxScore) * scaledMaxScore)
        : 0;
    const modulePercentage =
      scaledMaxScore > 0 ? Math.round((scaledScore / scaledMaxScore) * 100) : 0;

    return {
      module: module as SessionType,
      label: MODULE_LABELS[module],
      rawScore,
      rawMaxScore,
      scaledScore,
      scaledMaxScore,
      percentage: modulePercentage,
      questionCount: bucket?.questionCount ?? 0,
    };
  });

  return {
    totalQuestions,
    answeredQuestions,
    unansweredQuestions,
    correctAnswers,
    incorrectAnswers,
    totalScore,
    maxScore,
    percentage,
    pendingManualReview,
    aiMarkedCount,
    automaticMarkedCount,
    teilBreakdown,
    moduleBreakdown,
  };
}

export class QuestionManager {
  private questionIndex: Map<string, Question>;
  private answerIndex: Map<string, UserAnswer>;
  private resultIndex: Map<string, QuestionResult>;

  constructor(
    questions: Question[],
    answers: UserAnswer[],
    results: QuestionResult[]
  ) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('QuestionManager initialisation requires at least one question');
    }

    this.questionIndex = new Map(questions.map(question => [question.id, cloneQuestion(question)]));
    this.answerIndex = new Map(
      answers.map(answer => [answer.questionId, cloneAnswer(answer)])
    );
    this.resultIndex = new Map(
      results.map(result => [result.questionId, cloneResult(result)])
    );
  }

  private ensureQuestion(questionId: string): Question {
    const question = this.questionIndex.get(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} is not registered in the manager`);
    }
    return question;
  }

  private toArray<T>(map: Map<string, T>): T[] {
    return Array.from(map.values());
  }

  private buildEmptyAnswer(questionId: string): UserAnswer {
    return {
      questionId,
      answer: '',
      timeSpent: 0,
      attempts: 0,
      hintsUsed: 0,
      timestamp: new Date(),
    };
  }

  private updateResult(result: QuestionResult): void {
    this.resultIndex.set(result.questionId, cloneResult(result));
  }

  private updateAnswer(answer: UserAnswer): void {
    this.answerIndex.set(answer.questionId, cloneAnswer(answer));
  }

  getState(): QuestionManagerState {
    return {
      questions: this.toArray(this.questionIndex),
      answers: this.toArray(this.answerIndex),
      results: this.toArray(this.resultIndex),
    };
  }

  getAllQuestions(): Question[] {
    return this.toArray(this.questionIndex);
  }

  getUserAnswers(): UserAnswer[] {
    return this.toArray(this.answerIndex);
  }

  getQuestionResults(): QuestionResult[] {
    return this.toArray(this.resultIndex);
  }

  getResultForQuestion(questionId: string): QuestionResult | null {
    return this.resultIndex.get(questionId) ?? null;
  }

  getAnswerForQuestion(questionId: string): UserAnswer | null {
    return this.answerIndex.get(questionId) ?? null;
  }

  async submitAnswer(
    questionId: string,
    answerValue: AnswerValue,
    timeSpent: number,
    hintsUsed: number
  ): Promise<QuestionResult> {
    const question = this.ensureQuestion(questionId);
    if (question.isExample) {
      throw new Error('Example questions cannot be answered.');
    }

    const previousAnswer = this.answerIndex.get(questionId);
    const attempts = previousAnswer ? previousAnswer.attempts + 1 : 1;

    const payload: UserAnswer = {
      questionId,
      answer: answerValue,
      timeSpent,
      hintsUsed,
      attempts,
      timestamp: new Date(),
    };

    this.updateAnswer(payload);
    const normalizedAnswer = answerValue === null ? '' : answerValue;

    const result = await markQuestion(question, {
      ...payload,
      answer: normalizedAnswer,
    });
    this.updateResult(result);

    return result;
  }

  async submitAnswersBulk(
    answers: Array<{
      questionId: string;
      answer: AnswerValue;
      timeSpent: number;
      hintsUsed: number;
    }>
  ): Promise<QuestionResult[]> {
    const results: QuestionResult[] = [];

    for (const entry of answers) {
      if (!this.questionIndex.has(entry.questionId)) {
        throw new Error(`Question ${entry.questionId} is not tracked by QuestionManager`);
      }
      const question = this.ensureQuestion(entry.questionId);
      if (question.isExample) {
        throw new Error('Example questions cannot be answered.');
      }

      const result = await this.submitAnswer(
        entry.questionId,
        entry.answer,
        entry.timeSpent,
        entry.hintsUsed
      );
      results.push(result);
    }

    return results;
  }

  async finaliseSession(): Promise<QuestionSessionOutcome> {
    const orderedQuestions = this.getAllQuestions();
    const scorableQuestions = orderedQuestions.filter(question => !question.isExample);

    if (scorableQuestions.length === 0) {
      return {
        results: [],
        summary: buildQuestionSessionSummary([], []),
      };
    }

    // Ensure every scorable question has an answer object for downstream persistence
    const answers: UserAnswer[] = scorableQuestions.map(question => {
      const existing = this.answerIndex.get(question.id);
      if (existing) {
        return existing;
      }
      const emptyAnswer = this.buildEmptyAnswer(question.id);
      this.updateAnswer(emptyAnswer);
      return emptyAnswer;
    });

    const results = await markQuestions(scorableQuestions, answers);
    results.forEach(result => this.updateResult(result));

    const summary = buildQuestionSessionSummary(results, scorableQuestions);

    return {
      results: results.map(cloneResult),
      summary,
    };
  }
}
