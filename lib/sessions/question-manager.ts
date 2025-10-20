import type { Question, UserAnswer, QuestionResult } from './questions/question-types';
import { markQuestions } from './questions/question-marker';

export interface QuestionManagerState {
  questions: Question[];
  answers: UserAnswer[];
  results: QuestionResult[];
}

/**
 * QuestionManager - Handles all question-related operations
 * Manages answering, marking, results, and question flow
 */
export class QuestionManager {
  private questions: Question[];
  private userAnswers: UserAnswer[];
  private questionResults: QuestionResult[];

  constructor(
    questions: Question[] = [],
    answers: UserAnswer[] = [],
    results: QuestionResult[] = []
  ) {
    this.questions = [...questions];
    this.userAnswers = [...answers];
    this.questionResults = [...results];
  }

  /**
   * Update the question set (useful when questions are loaded/updated)
   */
  setQuestions(questions: Question[]): void {
    this.questions = [...questions];
  }

  /**
   * Hydrate manager with persisted answers/results
   */
  hydrate(answers: UserAnswer[] = [], results: QuestionResult[] = []): void {
    this.userAnswers = [...answers];
    this.questionResults = [...results];
  }

  /**
   * Snapshot current state for persistence
   */
  getState(): QuestionManagerState {
    return {
      questions: [...this.questions],
      answers: [...this.userAnswers],
      results: [...this.questionResults],
    };
  }

  /**
   * Get all questions
   */
  getAllQuestions(): Question[] {
    return [...this.questions];
  }

  /**
   * Get a specific question by ID
   */
  getQuestionById(questionId: string): Question | null {
    return this.questions.find(q => q.id === questionId) || null;
  }

  /**
   * Submit an answer for a question
   */
  async submitAnswer(
    questionId: string,
    answer: string | string[] | boolean,
    timeSpent: number = 0,
    hintsUsed: number = 0
  ): Promise<QuestionResult> {
    const question = this.getQuestionById(questionId);
    if (!question) {
      throw new Error(`Question with ID ${questionId} not found`);
    }

    const previousAnswer = this.userAnswers.find(a => a.questionId === questionId);
    const attempts = previousAnswer ? previousAnswer.attempts + 1 : 1;

    const userAnswer: UserAnswer = {
      questionId,
      answer,
      timeSpent,
      attempts,
      hintsUsed,
      timestamp: new Date(),
    };

    if (previousAnswer) {
      this.userAnswers = this.userAnswers.map(a =>
        a.questionId === questionId ? userAnswer : a
      );
    } else {
      this.userAnswers = [...this.userAnswers, userAnswer];
    }

    const [result] = await markQuestions([question], [userAnswer]);
    this.upsertResult(result);

    return result;
  }

  /**
   * Batch submit multiple answers (e.g., Teil submission)
   */
  async submitAnswersBulk(
    answers: Array<{
      questionId: string;
      answer: string | string[] | boolean;
      timeSpent?: number;
      hintsUsed?: number;
    }>
  ): Promise<QuestionResult[]> {
    const results: QuestionResult[] = [];
    for (const entry of answers) {
      const result = await this.submitAnswer(
        entry.questionId,
        entry.answer,
        entry.timeSpent ?? 0,
        entry.hintsUsed ?? 0
      );
      results.push(result);
    }
    return results;
  }

  /**
   * Get all user answers submitted so far
   */
  getUserAnswers(): UserAnswer[] {
    return [...this.userAnswers];
  }

  /**
   * Get answer for a specific question
   */
  getAnswerForQuestion(questionId: string): UserAnswer | null {
    return this.userAnswers.find(a => a.questionId === questionId) || null;
  }

  /**
   * Get all question results
   */
  getQuestionResults(): QuestionResult[] {
    return [...this.questionResults];
  }

  /**
   * Get result for a specific question
   */
  getResultForQuestion(questionId: string): QuestionResult | null {
    return this.questionResults.find(r => r.questionId === questionId) || null;
  }

  /**
   * Complete all unanswered questions (mark them as incorrect)
   */
  async completeAllQuestions(): Promise<{
    totalScore: number;
    maxScore: number;
    percentage: number;
    results: QuestionResult[];
  }> {
    if (this.questions.length === 0) {
      return {
        totalScore: 0,
        maxScore: 0,
        percentage: 0,
        results: [],
      };
    }

    const allResults = await markQuestions(this.questions, this.userAnswers);
    this.questionResults = allResults;

    const totalScore = allResults.reduce((sum, r) => sum + r.score, 0);
    const maxScore = this.questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return {
      totalScore,
      maxScore,
      percentage,
      results: allResults,
    };
  }

  /**
   * Get question statistics
   */
  getQuestionStats(): {
    total: number;
    answered: number;
    unanswered: number;
    correct: number;
    incorrect: number;
    percentage: number;
  } {
    const total = this.questions.length;
    const answered = this.userAnswers.length;
    const unanswered = total - answered;
    const correct = this.questionResults.filter(r => r.isCorrect).length;
    const incorrect = this.questionResults.filter(r => !r.isCorrect).length;
    const percentage = total > 0 ? (answered / total) * 100 : 0;

    return {
      total,
      answered,
      unanswered,
      correct,
      incorrect,
      percentage,
    };
  }

  /**
   * Get score statistics
   */
  getScoreStats(): {
    currentScore: number;
    maxPossibleScore: number;
    percentage: number;
  } {
    const currentScore = this.questionResults.reduce((sum, r) => sum + r.score, 0);
    const maxPossibleScore = this.questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = maxPossibleScore > 0 ? (currentScore / maxPossibleScore) * 100 : 0;

    return {
      currentScore,
      maxPossibleScore,
      percentage,
    };
  }

  /**
   * Reset all answers and results (useful for starting over)
   */
  reset(): void {
    this.userAnswers = [];
    this.questionResults = [];
  }

  private upsertResult(result: QuestionResult): void {
    const existingIndex = this.questionResults.findIndex(
      r => r.questionId === result.questionId
    );
    if (existingIndex >= 0) {
      this.questionResults[existingIndex] = result;
    } else {
      this.questionResults = [...this.questionResults, result];
    }
  }

  /**
   * Export current state for persistence
   */
  export(): {
    userAnswers: UserAnswer[];
    questionResults: QuestionResult[];
  } {
    return {
      userAnswers: this.userAnswers,
      questionResults: this.questionResults
    };
  }

  /**
   * Import state from persistence
   */
  import(data: {
    userAnswers?: UserAnswer[];
    questionResults?: QuestionResult[];
  }): void {
    if (data.userAnswers) {
      this.userAnswers = data.userAnswers;
    }
    if (data.questionResults) {
      this.questionResults = data.questionResults;
    }
  }
}
