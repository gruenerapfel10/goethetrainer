import type { Question } from './question-types';
import { QuestionModuleId } from '@/lib/questions/modules/types';

export function getQuestionUnitCount(question: Question | null | undefined): number {
  if (!question) {
    return 0;
  }

  const moduleId = (question.moduleId ?? (question as any).registryType) as
    | QuestionModuleId
    | undefined;

  if (moduleId === QuestionModuleId.STATEMENT_MATCH) {
    if (Array.isArray(question.statements) && question.statements.length > 0) {
      return question.statements.length;
    }
    if (typeof question.points === 'number' && Number.isFinite(question.points)) {
      return Math.max(1, Math.round(question.points));
    }
  }

  return 1;
}

export function sumQuestionUnitCounts(questions: Question[]): number {
  return questions.reduce((sum, question) => sum + getQuestionUnitCount(question), 0);
}
