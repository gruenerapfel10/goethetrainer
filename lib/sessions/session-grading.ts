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
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🎯 ANSWER SUBMISSION & GRADING - STARTING`);
  console.log(`   Question ID: ${payload.questionId}`);
  console.log(`   Time Spent: ${payload.timeSpent}ms`);
  console.log(`   Hints Used: ${payload.hintsUsed}`);
  console.log(`${'═'.repeat(80)}`);

  try {
    ensureSessionCollections(session);

    const manager = new QuestionManager(
      session.data.questions,
      session.data.answers ?? [],
      session.data.results ?? []
    );

    console.log(`⏳ Submitting answer via QuestionManager...`);
    const result = await manager.submitAnswer(
      payload.questionId,
      payload.answer,
      payload.timeSpent,
      payload.hintsUsed
    );

    console.log(`✅ Answer graded successfully`);
    console.log(`   Score: ${result.score}/${result.maxScore}`);
    console.log(`   Result: ${result.isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    console.log(`   Feedback: ${result.feedback}`);

    mapManagerStateToSession(session, manager.getState(), payload.questionId);
    touchSession(session);

    const state = manager.getState();
    console.log(`\n✅ ANSWER SUBMISSION & GRADING - COMPLETED`);
    console.log(`   Current Score: ${state.results.reduce((sum, r) => sum + r.score, 0)}/${state.questions.reduce((sum, q) => sum + (q.points ?? 0), 0)}`);
    console.log(`   Answers Submitted: ${state.answers.length}/${state.questions.length}`);
    console.log(`${'═'.repeat(80)}\n`);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ ANSWER SUBMISSION & GRADING - FAILED`);
    console.error(`   Error: ${errorMsg}`);
    console.log(`${'═'.repeat(80)}\n`);
    throw error;
  }
}

export async function finaliseSession(
  session: Session
): Promise<CompletionSummary> {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🏁 SESSION FINALISATION - STARTING`);
  console.log(`   Session ID: ${session.id}`);
  console.log(`${'═'.repeat(80)}`);

  try {
    ensureSessionCollections(session);

    const manager = new QuestionManager(
      session.data.questions,
      session.data.answers ?? [],
      session.data.results ?? []
    );

    console.log(`⏳ Computing final results...`);
    const outcome = await manager.finaliseSession();

    console.log(`✅ Results computed`);
    console.log(`   Total Questions: ${outcome.summary.totalQuestions}`);
    console.log(`   Answered: ${outcome.summary.answeredQuestions}`);
    console.log(`   Correct: ${outcome.summary.correctAnswers}`);
    console.log(`   Incorrect: ${outcome.summary.incorrectAnswers}`);
    console.log(`   Score: ${outcome.summary.totalScore}/${outcome.summary.maxScore}`);
    console.log(`   Percentage: ${((outcome.summary.totalScore / outcome.summary.maxScore) * 100).toFixed(1)}%`);

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
    const completedAt = new Date();
    const completedAtIso = completedAt.toISOString();
    session.data.resultsSummary = outcome.summary;
    session.data.resultsGeneratedAt = completedAtIso;
    session.data.currentScore = outcome.summary.totalScore;
    session.data.maxPossibleScore = outcome.summary.maxScore;
    session.data.questionsAnswered = outcome.summary.answeredQuestions;
    session.data.questionsCorrect = outcome.summary.correctAnswers;
    session.data.questionsIncorrect = outcome.summary.incorrectAnswers;
    session.data.completedAt = completedAtIso;
    session.status = 'completed';
    session.endedAt = completedAt;
    if (session.metadata) {
      session.metadata.completedAt = completedAtIso;
    } else {
      session.metadata = { completedAt: completedAtIso };
    }
    if (session.startedAt && session.endedAt) {
      const durationSeconds = Math.max(
        0,
        Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)
      );
      session.duration = durationSeconds;
      console.log(`   Duration: ${(durationSeconds / 60).toFixed(2)} minutes`);
    }

    touchSession(session);

    console.log(`\n✅ SESSION FINALISATION - COMPLETED`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Persisted results for display`);
    console.log(`${'═'.repeat(80)}\n`);

    return outcome;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ SESSION FINALISATION - FAILED`);
    console.error(`   Error: ${errorMsg}`);
    console.log(`${'═'.repeat(80)}\n`);
    throw error;
  }
}
