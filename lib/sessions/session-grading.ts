import { QuestionManager } from './question-manager';
import type { QuestionManagerState } from './question-manager';
import type {
  CompletionSummary,
  Session,
  SubmitAnswerPayload,
  QuestionResult,
} from './types';
import { ensureSessionCollections, touchSession } from './session-store';
import { ensureQuestionIdentifiers } from './session-answers';
import type { Question } from './questions/question-types';

export function mapManagerStateToSession(
  session: Session,
  state: QuestionManagerState,
  lastAnsweredId: string | null
): void {
  ensureSessionCollections(session);

  const answerIndex = new Map(
    state.answers.map(answer => [answer.questionId, answer])
  );

  const totalScore = state.results.reduce((sum, item) => sum + item.score, 0);
  const maxPossibleScore = state.questions.reduce(
    (sum, item) => sum + (item.points ?? 0),
    0
  );
  const correctAnswers = state.results.filter(result => result.isCorrect).length;
  const incorrectAnswers = state.results.filter(
    result => !result.isCorrect && result.markedBy !== 'manual'
  ).length;

  const timestamp = new Date().toISOString();

  session.data.questions = ensureQuestionIdentifiers(state.questions.map(question => {
    const answer = answerIndex.get(question.id);
    const hasAnswer = !!answer;

    return {
      ...question,
      answer: answer?.answer ?? (question as any).answer ?? null,
      answered: hasAnswer || !!question.answered,
      lastSubmittedAt:
        hasAnswer || question.id === lastAnsweredId
          ? timestamp
          : (question as any).lastSubmittedAt,
    } as Question;
  }));

  session.data.answers = state.answers;
  session.data.results = state.results;
  session.data.currentScore = totalScore;
  session.data.maxPossibleScore = maxPossibleScore;
  session.data.questionsAnswered = state.answers.length;
  session.data.questionsCorrect = correctAnswers;
  session.data.questionsIncorrect = incorrectAnswers;

  if (lastAnsweredId) {
    session.data.lastAnsweredQuestion = lastAnsweredId;
  }
}

export async function gradeAnswer(
  session: Session,
  payload: SubmitAnswerPayload
): Promise<QuestionResult> {
  ensureSessionCollections(session);

  const manager = new QuestionManager(
    session.data.questions,
    session.data.answers ?? [],
    session.data.results ?? []
  );

  const result = await manager.submitAnswer(
    payload.questionId,
    payload.answer,
    payload.timeSpent,
    payload.hintsUsed
  );

  mapManagerStateToSession(session, manager.getState(), payload.questionId);
  touchSession(session);

  return result;
}

export async function finaliseSession(
  session: Session
): Promise<CompletionSummary> {
  ensureSessionCollections(session);

  const manager = new QuestionManager(
    session.data.questions,
    session.data.answers ?? [],
    session.data.results ?? []
  );

  const outcome = await manager.finaliseSession();

  session.data.questions = ensureQuestionIdentifiers(
    outcome.results.map(result => ({
      ...result.question,
      answer: result.userAnswer.answer,
      answered: true,
      lastSubmittedAt: new Date().toISOString(),
    }))
  );
  session.data.answers = manager.getUserAnswers();
  session.data.results = manager.getQuestionResults();
  session.data.currentScore = outcome.summary.totalScore;
  session.data.maxPossibleScore = outcome.summary.maxScore;
  session.data.questionsAnswered = outcome.summary.answeredQuestions;
  session.data.questionsCorrect = outcome.summary.correctAnswers;
  session.data.questionsIncorrect = outcome.summary.incorrectAnswers;
  session.data.completedAt = new Date().toISOString();

  touchSession(session);

  return outcome;
}
