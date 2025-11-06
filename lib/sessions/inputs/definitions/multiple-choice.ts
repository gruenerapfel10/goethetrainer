import { z } from 'zod';
import type { QuestionResult } from '../../questions/question-types';
import { registerInputDefinition } from '../input-registry';
import { QuestionInputType, type MarkAnswerContext } from '../types';

const MultipleChoiceAnswerSchema = z
  .union([
    z.string().min(1, 'Antwort erforderlich'),
    z.record(z.string(), z.string().min(1)),
  ])
  .nullable();

function scoreGapSelections(
  question: MarkAnswerContext['question'],
  answers: Record<string, string>,
): Pick<QuestionResult, 'score' | 'isCorrect' | 'feedback'> {
  const basePoints = question.points ?? 0;
  const gaps = Array.isArray(question.gaps) ? question.gaps : [];

  if (!gaps.length) {
    return {
      score: 0,
      isCorrect: false,
      feedback: 'Keine Vergleichswerte für Lückentext gefunden.',
    };
  }

  let correctCount = 0;
  gaps.forEach(gap => {
    const expected = gap.correctOptionId ?? gap.correctAnswer;
    if (!expected) {
      return;
    }
    if (answers[gap.id] === expected) {
      correctCount += 1;
    }
  });

  const ratio = correctCount / gaps.length;
  const isPerfect = correctCount === gaps.length;
  const feedback = isPerfect
    ? 'Alle Lücken korrekt ausgefüllt.'
    : `Du hast ${correctCount} von ${gaps.length} Lücken korrekt ausgefüllt.`;

  return {
    score: Math.round(basePoints * ratio),
    isCorrect: isPerfect,
    feedback,
  };
}

function scoreSingleSelection(
  question: MarkAnswerContext['question'],
  answerId: string,
): Pick<QuestionResult, 'score' | 'isCorrect' | 'feedback'> {
  const basePoints = question.points ?? 0;
  const expectedId = question.correctOptionId ?? String(question.correctAnswer ?? '');

  const isCorrect = answerId === expectedId;
  const feedback = isCorrect
    ? 'Richtige Antwort.'
    : (() => {
        const correctOption =
          question.options?.find(option => option.id === expectedId) ??
          question.options?.find(option => option.isCorrect);
        if (!correctOption) {
          return 'Falsch.';
        }
        return `Falsch. Die richtige Antwort lautet: ${correctOption.text}.`;
      })();

  return {
    score: isCorrect ? basePoints : 0,
    isCorrect,
    feedback,
  };
}

async function markMultipleChoice(context: MarkAnswerContext): Promise<QuestionResult> {
  const { question, answer, userAnswer } = context;
  const basePoints = question.points ?? 0;

  if (!answer) {
    return {
      questionId: question.id,
      question,
      userAnswer,
      score: 0,
      maxScore: basePoints,
      isCorrect: false,
      feedback: 'Keine Antwort eingereicht.',
      markedBy: 'automatic',
    };
  }

  const parsed = MultipleChoiceAnswerSchema.safeParse(answer);
  if (!parsed.success) {
    return {
      questionId: question.id,
      question,
      userAnswer,
      score: 0,
      maxScore: basePoints,
      isCorrect: false,
      feedback: 'Antwort konnte nicht interpretiert werden.',
      markedBy: 'automatic',
    };
  }

  const payload = parsed.data;

  const evaluation =
    typeof payload === 'string'
      ? scoreSingleSelection(question, payload)
      : scoreGapSelections(question, payload ?? {});

  return {
    questionId: question.id,
    question,
    userAnswer,
    score: evaluation.score,
    maxScore: basePoints,
    isCorrect: evaluation.isCorrect,
    feedback: evaluation.feedback,
    markedBy: 'automatic',
  };
}

registerInputDefinition({
  id: QuestionInputType.MULTIPLE_CHOICE,
  label: 'Multiple Choice',
  description:
    'Einzelne Auswahl oder Goethe-konforme Lückentexte mit Dropdown-Auswahlmöglichkeiten.',
  category: 'selection',
  answerSchema: MultipleChoiceAnswerSchema,
  createInitialValue: question => {
    if (question.isExample && question.exampleAnswer) {
      return question.exampleAnswer as unknown as string;
    }
    return null;
  },
  normalise: (value, question) => {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = MultipleChoiceAnswerSchema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }

    if (typeof value === 'object') {
      const record: Record<string, string> = {};
      Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
        if (typeof raw === 'string' && raw.trim().length > 0) {
          record[key] = raw.trim();
        }
      });
      return Object.keys(record).length > 0 ? record : null;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0 ? value.trim() : null;
    }

    return null;
  },
  toPersist: value => value,
  fromPersist: value => {
    if (value === null || value === undefined) {
      return null;
    }
    const parsed = MultipleChoiceAnswerSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  },
  ui: {
    component: 'MultipleChoice',
  },
  marking: {
    strategy: 'automatic',
    mark: markMultipleChoice,
  },
  metadata: {
    supportsHints: true,
  },
});
