import { z } from 'zod';
import type { QuestionResult } from '../../questions/question-types';
import { registerInputDefinition } from '../input-registry';
import { QuestionInputType, type MarkAnswerContext } from '../types';

const TrueFalseAnswerSchema = z.boolean().nullable();

function normaliseBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
  }
  return null;
}

async function markTrueFalse(context: MarkAnswerContext<boolean>): Promise<QuestionResult> {
  const { question, answer, userAnswer } = context;
  const basePoints = question.points ?? 0;
  const expected =
    question.correctAnswer === true ||
    (typeof question.correctAnswer === 'string' && question.correctAnswer.toLowerCase() === 'true');
  const isCorrect = answer === expected;

  return {
    questionId: question.id,
    question,
    userAnswer,
    score: isCorrect ? basePoints : 0,
    maxScore: basePoints,
    isCorrect,
    feedback: isCorrect ? 'Richtige Antwort.' : 'Diese Aussage ist leider falsch.',
    markedBy: 'automatic',
  };
}

registerInputDefinition({
  id: QuestionInputType.TRUE_FALSE,
  label: 'True or False',
  description: 'Bewerte eine Aussage als richtig oder falsch.',
  category: 'boolean',
  answerSchema: TrueFalseAnswerSchema,
  normalise: value => normaliseBoolean(value),
  ui: {
    component: 'TrueFalse',
  },
  marking: {
    strategy: 'automatic',
    mark: markTrueFalse,
  },
  metadata: {
    supportsHints: false,
  },
});
