import { generateUUID } from '@/lib/utils';
import type { Session, AnswerValue } from './types';
import type { Question } from './questions/question-types';
import { ensureSessionCollections } from './session-store';
import { QuestionInputType } from './inputs/types';

export function hasAnswerValue(value: AnswerValue | null | undefined): boolean {
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

export function ensureQuestionIdentifiers(questions: Question[]): Question[] {
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

export function normaliseAnsweredFlag(question: Question): Question {
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

  const resolvedInputType: QuestionInputType =
    (question as Question).inputType ??
    (question as Question).answerType ??
    QuestionInputType.SHORT_TEXT;

  return {
    ...question,
    answer: value ?? null,
    answered,
    inputType: resolvedInputType,
    answerType: resolvedInputType,
  };
}

export function applyAnswersToSession(
  session: Session,
  answers: Record<string, AnswerValue>
): void {
  ensureSessionCollections(session);

  const questions = session.data.questions as Question[];
  const answerList = session.data.answers ?? [];
  let results = session.data.results ?? [];
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

    results = results.filter(result => result.questionId !== questionId);
    session.data.lastAnsweredQuestion = questionId;
  });

  session.data.answers = answerList;
  session.data.questions = ensureQuestionIdentifiers(questions);
  session.data.results = results;
  const totalQuestions = session.data.questions.length;
  const answeredCount = answerList.length;
  const correctCount = session.data.results.filter(result => result.isCorrect).length;
  const score = session.data.results.reduce((sum, result) => sum + (result.score ?? 0), 0);
  const maxScore = session.data.questions.reduce((sum, question) => sum + (question.points ?? 0), 0);

  session.data.progress = {
    totalQuestions,
    answeredQuestions: answeredCount,
    correctAnswers: correctCount,
    score,
    maxScore,
  };
  session.data.metrics = {
    ...(session.data.metrics ?? {}),
    answeredQuestions: answeredCount,
    correctAnswers: correctCount,
    score,
    maxScore,
  };
}
