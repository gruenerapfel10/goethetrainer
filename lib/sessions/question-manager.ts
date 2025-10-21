import { markQuestion, markQuestions } from './questions/question-marker';
import type { Question, QuestionResult, UserAnswer } from './questions/question-types';

export interface QuestionManagerState {
  questions: Question[];
  answers: UserAnswer[];
  results: QuestionResult[];
}

export interface QuestionSessionSummary {
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  pendingManualReview: number;
  aiMarkedCount: number;
  automaticMarkedCount: number;
}

export interface QuestionSessionOutcome {
  results: QuestionResult[];
  summary: QuestionSessionSummary;
}

function cloneQuestion(question: Question): Question {
  return JSON.parse(JSON.stringify(question));
}

function cloneAnswer(answer: UserAnswer): UserAnswer {
  return {
    ...answer,
    timestamp: new Date(answer.timestamp),
  };
}

function cloneResult(result: QuestionResult): QuestionResult {
  return {
    ...result,
    question: cloneQuestion(result.question),
    userAnswer: cloneAnswer(result.userAnswer),
  };
}

export class QuestionManager {
  private questionIndex: Map<string, Question>;
  private answerIndex: Map<string, UserAnswer>;
  private resultIndex: Map<string, QuestionResult>;

  constructor(
    questions: Question[],
    answers: UserAnswer[],
    results: QuestionResult[]
  ) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('QuestionManager initialisation requires at least one question');
    }

    this.questionIndex = new Map(questions.map(question => [question.id, cloneQuestion(question)]));
    this.answerIndex = new Map(
      answers.map(answer => [answer.questionId, cloneAnswer(answer)])
    );
    this.resultIndex = new Map(
      results.map(result => [result.questionId, cloneResult(result)])
    );
  }

  private ensureQuestion(questionId: string): Question {
    const question = this.questionIndex.get(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} is not registered in the manager`);
    }
    return question;
  }

  private toArray<T>(map: Map<string, T>): T[] {
    return Array.from(map.values());
  }

  private buildEmptyAnswer(questionId: string): UserAnswer {
    return {
      questionId,
      answer: '',
      timeSpent: 0,
      attempts: 0,
      hintsUsed: 0,
      timestamp: new Date(),
    };
  }

  private updateResult(result: QuestionResult): void {
    this.resultIndex.set(result.questionId, cloneResult(result));
  }

  private updateAnswer(answer: UserAnswer): void {
    this.answerIndex.set(answer.questionId, cloneAnswer(answer));
  }

  getState(): QuestionManagerState {
    return {
      questions: this.toArray(this.questionIndex),
      answers: this.toArray(this.answerIndex),
      results: this.toArray(this.resultIndex),
    };
  }

  getAllQuestions(): Question[] {
    return this.toArray(this.questionIndex);
  }

  getUserAnswers(): UserAnswer[] {
    return this.toArray(this.answerIndex);
  }

  getQuestionResults(): QuestionResult[] {
    return this.toArray(this.resultIndex);
  }

  getResultForQuestion(questionId: string): QuestionResult | null {
    return this.resultIndex.get(questionId) ?? null;
  }

  getAnswerForQuestion(questionId: string): UserAnswer | null {
    return this.answerIndex.get(questionId) ?? null;
  }

  async submitAnswer(
    questionId: string,
    answerValue: string | string[] | boolean,
    timeSpent: number,
    hintsUsed: number
  ): Promise<QuestionResult> {
    const question = this.ensureQuestion(questionId);

    const previousAnswer = this.answerIndex.get(questionId);
    const attempts = previousAnswer ? previousAnswer.attempts + 1 : 1;

    const payload: UserAnswer = {
      questionId,
      answer: answerValue,
      timeSpent,
      hintsUsed,
      attempts,
      timestamp: new Date(),
    };

    this.updateAnswer(payload);
    const result = await markQuestion(question, payload);
    this.updateResult(result);

    return result;
  }

  async submitAnswersBulk(
    answers: Array<{
      questionId: string;
      answer: string | string[] | boolean;
      timeSpent: number;
      hintsUsed: number;
    }>
  ): Promise<QuestionResult[]> {
    const results: QuestionResult[] = [];

    for (const entry of answers) {
      if (!this.questionIndex.has(entry.questionId)) {
        throw new Error(`Question ${entry.questionId} is not tracked by QuestionManager`);
      }

      const result = await this.submitAnswer(
        entry.questionId,
        entry.answer,
        entry.timeSpent,
        entry.hintsUsed
      );
      results.push(result);
    }

    return results;
  }

  async finaliseSession(): Promise<QuestionSessionOutcome> {
    const orderedQuestions = this.getAllQuestions();

    // Ensure every question has an answer object for downstream persistence
    const answers: UserAnswer[] = orderedQuestions.map(question => {
      const existing = this.answerIndex.get(question.id);
      if (existing) {
        return existing;
      }
      const emptyAnswer = this.buildEmptyAnswer(question.id);
      this.updateAnswer(emptyAnswer);
      return emptyAnswer;
    });

    const results = await markQuestions(orderedQuestions, answers);
    results.forEach(result => this.updateResult(result));

    const summary = this.buildSummary(results, orderedQuestions);

    return {
      results: results.map(cloneResult),
      summary,
    };
  }

  private buildSummary(results: QuestionResult[], questions: Question[]): QuestionSessionSummary {
    const totalQuestions = questions.length;
    const answeredQuestions = results.filter(result => {
      const value = result.userAnswer.answer;
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== '' && value !== null && value !== undefined;
    }).length;

    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    const maxScore = questions.reduce((sum, question) => sum + (question.points ?? 0), 0);

    const correctAnswers = results.filter(result => result.isCorrect).length;
    const pendingManualReview = results.filter(result => result.markedBy === 'manual').length;
    const incorrectAnswers = results.filter(
      result => !result.isCorrect && result.markedBy !== 'manual'
    ).length;

    const aiMarkedCount = results.filter(result => result.markedBy === 'ai').length;
    const automaticMarkedCount = results.filter(result => result.markedBy === 'automatic').length;

    const unansweredQuestions = totalQuestions - answeredQuestions;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    return {
      totalQuestions,
      answeredQuestions,
      unansweredQuestions,
      correctAnswers,
      incorrectAnswers,
      totalScore,
      maxScore,
      percentage,
      pendingManualReview,
      aiMarkedCount,
      automaticMarkedCount,
    };
  }
}
