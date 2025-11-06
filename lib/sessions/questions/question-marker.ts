import { getQuestionModule } from '@/lib/questions/modules';
import {
  QuestionModuleId,
  type QuestionModuleMarkResult,
} from '@/lib/questions/modules/types';
import type { Question, QuestionResult, UserAnswer } from './question-types';

function resolveModuleId(question: Question): QuestionModuleId {
  const moduleId =
    (question.moduleId ??
      question.registryType ??
      QuestionModuleId.MULTIPLE_CHOICE) as QuestionModuleId;
  return moduleId;
}

export async function markQuestion(
  question: Question,
  answer: UserAnswer
): Promise<QuestionResult> {
  const module = getQuestionModule(resolveModuleId(question));
  const normalised = module.normaliseAnswer(answer.answer, question);

  const userAnswer: UserAnswer = {
    ...answer,
    answer: normalised as UserAnswer['answer'],
  };

  const result: QuestionModuleMarkResult = await module.mark({
    question,
    answer: normalised,
    userAnswer,
  });

  return {
    ...result,
    questionId: question.id,
    question,
    userAnswer,
  };
}

export async function markQuestions(
  questions: Question[],
  answers: UserAnswer[]
): Promise<QuestionResult[]> {
  const answersMap = new Map(answers.map(entry => [entry.questionId, entry]));

  return Promise.all(
    questions.map(question => {
      const answer =
        answersMap.get(question.id) ??
        ({
          questionId: question.id,
          answer: null,
          timeSpent: 0,
          attempts: 0,
          hintsUsed: 0,
          timestamp: new Date(),
        } as UserAnswer);

      return markQuestion(question, answer);
    })
  );
}

