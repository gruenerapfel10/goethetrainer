import { type Question } from '@/lib/sessions/questions/question-types';

export function sanitizeQuestionForPaper(question: Question): Question {
  const {
    answer,
    answered,
    exampleAnswer,
    isExample,
    answerType,
    userAnswer,
    ...rest
  } = question as Question & { userAnswer?: unknown };

  const sanitized: Question = {
    ...rest,
    answer: undefined,
    answered: false,
    exampleAnswer: undefined,
    isExample: false,
    answerType: rest.inputType ?? rest.answerType,
  };
  return sanitized;
}
