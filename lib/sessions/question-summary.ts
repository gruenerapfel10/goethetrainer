import type { Question, QuestionResult } from './questions/question-types';
import type {
  ModuleBreakdownEntry,
  SessionType,
  TeilBreakdownEntry,
} from './types';
import { SessionTypeEnum } from './session-registry';
import { QuestionModuleId } from '@/lib/questions/modules/types';

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
