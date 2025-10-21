import type { Session } from './types';
import type { QuestionResult } from './questions/question-types';

export interface SessionStatistics {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  pendingManualReview: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  durationSeconds: number;
}

function calculateDurationSeconds(session: Session): number {
  if (typeof session.duration === 'number' && session.duration >= 0) {
    return session.duration;
  }

  if (session.startedAt) {
    const start = new Date(session.startedAt);
    const end = session.endedAt ? new Date(session.endedAt) : new Date();
    const delta = Math.max(0, end.getTime() - start.getTime());
    return Math.round(delta / 1000);
  }

  return 0;
}

export class StatisticsManager {
  static calculate(session: Session, results: QuestionResult[]): SessionStatistics {
    const totalQuestions = session.data.questions.length;
    const answeredQuestions = results.filter(result => {
      const value = result.userAnswer.answer;
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== '' && value !== null && value !== undefined;
    }).length;

    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    const maxScore = session.data.questions.reduce(
      (sum, question) => sum + (question.points ?? 0),
      0
    );

    const correctAnswers = results.filter(result => result.isCorrect).length;
    const pendingManualReview = results.filter(result => result.markedBy === 'manual').length;
    const incorrectAnswers = results.filter(
      result => !result.isCorrect && result.markedBy !== 'manual'
    ).length;

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const durationSeconds = calculateDurationSeconds(session);

    return {
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      incorrectAnswers,
      pendingManualReview,
      totalScore,
      maxScore,
      percentage,
      durationSeconds,
    };
  }

  static apply(session: Session, statistics: SessionStatistics): void {
    session.data.currentScore = statistics.totalScore;
    session.data.maxPossibleScore = statistics.maxScore;
    session.data.questionsAnswered = statistics.answeredQuestions;
    session.data.questionsCorrect = statistics.correctAnswers;
    session.data.questionsIncorrect = statistics.incorrectAnswers;
    session.data.questionsPendingReview = statistics.pendingManualReview;
    session.data.completionPercentage = statistics.percentage;
    session.duration = statistics.durationSeconds;
    session.metadata = {
      ...session.metadata,
      summary: statistics,
    };
  }
}
