import { markQuestion, markQuestions } from './questions/question-marker';
import type { Question, QuestionResult, UserAnswer } from './questions/question-types';
import type { AnswerValue } from './types';
import {
  buildQuestionSessionSummary,
  type QuestionSessionOutcome,
} from './question-summary';

export { buildQuestionSessionSummary } from './question-summary';
export type { QuestionSessionSummary, QuestionSessionOutcome } from './question-summary';

export interface QuestionManagerState {
  questions: Question[];
  answers: UserAnswer[];
  results: QuestionResult[];
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
    answerValue: AnswerValue,
    timeSpent: number,
    hintsUsed: number
  ): Promise<QuestionResult> {
    const question = this.ensureQuestion(questionId);
    if (question.isExample) {
      throw new Error('Example questions cannot be answered.');
    }

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
    const normalizedAnswer = answerValue === null ? '' : answerValue;

    const result = await markQuestion(question, {
      ...payload,
      answer: normalizedAnswer,
    });
    this.updateResult(result);

    return result;
  }

  async submitAnswersBulk(
    answers: Array<{
      questionId: string;
      answer: AnswerValue;
      timeSpent: number;
      hintsUsed: number;
    }>
  ): Promise<QuestionResult[]> {
    const results: QuestionResult[] = [];

    for (const entry of answers) {
      if (!this.questionIndex.has(entry.questionId)) {
        throw new Error(`Question ${entry.questionId} is not tracked by QuestionManager`);
      }
      const question = this.ensureQuestion(entry.questionId);
      if (question.isExample) {
        throw new Error('Example questions cannot be answered.');
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
    const scorableQuestions = orderedQuestions.filter(question => !question.isExample);

    if (scorableQuestions.length === 0) {
      return {
        results: [],
        summary: buildQuestionSessionSummary([], []),
      };
    }

    // Ensure every scorable question has an answer object for downstream persistence
    const answers: UserAnswer[] = scorableQuestions.map(question => {
      const existing = this.answerIndex.get(question.id);
      if (existing) {
        return existing;
      }
      const emptyAnswer = this.buildEmptyAnswer(question.id);
      this.updateAnswer(emptyAnswer);
      return emptyAnswer;
    });

    const results = await markQuestions(scorableQuestions, answers);
    results.forEach(result => this.updateResult(result));

    const summary = buildQuestionSessionSummary(results, scorableQuestions);

    return {
      results: results.map(cloneResult),
      summary,
    };
  }
}
