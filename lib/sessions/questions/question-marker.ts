import { getQuestionMetadata } from './question-registry';
import { MarkingMethod, QuestionTypeName } from './question-enums';
import {
  AnswerType,
  Question,
  QuestionOption,
  QuestionResult,
  UserAnswer,
} from './question-types';
import { markQuestionWithAI } from './standard-marker';

type MarkerId = 'automatic' | 'ai' | 'manual';

interface MarkerContext {
  question: Question;
  answer: UserAnswer;
  metadataType: QuestionTypeName;
}

interface Marker {
  id: MarkerId;
  mark(context: MarkerContext): Promise<QuestionResult>;
}

function normaliseOptionText(option?: QuestionOption | null): string | undefined {
  if (!option) return undefined;
  return option.text;
}

class AutomaticMarker implements Marker {
  id: MarkerId = 'automatic';

  async mark({ question, answer }: MarkerContext): Promise<QuestionResult> {
    const basePoints = question.points ?? 0;
    let score = 0;
    let isCorrect = false;
    let feedback = '';

    switch (question.answerType) {
      case AnswerType.GAP_TEXT_MULTIPLE_CHOICE:
      case AnswerType.MATCHING:
      case AnswerType.TRUE_FALSE:
      case AnswerType.SHORT_ANSWER:
      case AnswerType.FILL_BLANK: {
        const evaluation = this.evaluateObjectiveQuestion(question, answer.answer);
        score = evaluation.score * basePoints;
        isCorrect = evaluation.isCorrect;
        feedback = evaluation.feedback;
        break;
      }

      default: {
        feedback =
          'Dieser Fragetyp wird automatisch bewertet, konnte aber nicht automatisch klassifiziert werden.';
        break;
      }
    }

    return {
      questionId: question.id,
      question,
      userAnswer: answer,
      score: Math.round(Math.max(0, Math.min(basePoints, score))),
      maxScore: basePoints,
      isCorrect,
      feedback,
      markedBy: 'automatic',
    };
  }

  private evaluateObjectiveQuestion(
    question: Question,
    rawAnswer: string | string[] | boolean
  ): { score: number; isCorrect: boolean; feedback: string } {
    const basePoints = question.points ?? 0;
    const answerType = question.answerType;

    if (answerType === AnswerType.GAP_TEXT_MULTIPLE_CHOICE) {
      const userAnswerId = String(rawAnswer ?? '');
      const correctId = question.correctOptionId ?? '';
      const isCorrect = userAnswerId === correctId;

      const userOption = question.options?.find(opt => opt.id === userAnswerId);
      const correctOption =
        question.options?.find(opt => opt.id === correctId) ??
        question.options?.find(opt => opt.isCorrect);

      const feedback = isCorrect
        ? 'Richtige Antwort.'
        : correctOption
          ? `Falsch. Die richtige Antwort lautet: ${correctOption.text}.`
          : 'Falsch.';

      return {
        score: isCorrect ? 1 : 0,
        isCorrect,
        feedback,
      };
    }

    if (answerType === AnswerType.TRUE_FALSE) {
      const expected = String(question.correctAnswer).toLowerCase();
      const provided = String(rawAnswer ?? '').toLowerCase();
      const isCorrect = expected === provided;
      return {
        score: isCorrect ? 1 : 0,
        isCorrect,
        feedback: isCorrect ? 'Richtige Antwort.' : `Falsch. Erwartet: ${expected}.`,
      };
    }

    if (answerType === AnswerType.FILL_BLANK) {
      const expected = question.correctAnswer;
      if (!expected) {
        return { score: 0, isCorrect: false, feedback: 'Keine korrekte Lösung hinterlegt.' };
      }

      if (Array.isArray(expected) && Array.isArray(rawAnswer)) {
        const comparisons = expected.map((value, index) => {
          const provided = rawAnswer[index];
          return (
            String(provided ?? '').trim().toLowerCase() ===
            String(value ?? '').trim().toLowerCase()
          );
        });

        const correctCount = comparisons.filter(Boolean).length;
        const score = expected.length > 0 ? correctCount / expected.length : 0;
        const isCorrect = correctCount === expected.length;
        return {
          score,
          isCorrect,
          feedback: isCorrect
            ? 'Alle Lücken korrekt ausgefüllt.'
            : `Nur ${correctCount} von ${expected.length} Antworten korrekt.`,
        };
      }

      const isCorrect =
        String(rawAnswer ?? '').trim().toLowerCase() ===
        String(expected ?? '').trim().toLowerCase();

      return {
        score: isCorrect ? 1 : 0,
        isCorrect,
        feedback: isCorrect ? 'Richtige Antwort.' : 'Falsch ausgefüllt.',
      };
    }

    if (answerType === AnswerType.SHORT_ANSWER) {
      const supplied = String(rawAnswer ?? '').trim().toLowerCase();
      const expected = String(question.correctAnswer ?? '').trim().toLowerCase();
      if (!supplied) {
        return { score: 0, isCorrect: false, feedback: 'Keine Antwort eingereicht.' };
      }

      const isExactMatch = supplied === expected;
      if (isExactMatch) {
        return { score: 1, isCorrect: true, feedback: 'Richtige Antwort.' };
      }

      // Basic similarity metric (Levenshtein ratio)
      const similarity = this.calculateSimilarity(supplied, expected);
      if (similarity >= 0.85) {
        return {
          score: 0.7,
          isCorrect: true,
          feedback: 'Antwort ist im Kern korrekt (kleine Abweichungen).',
        };
      }

      return {
        score: 0,
        isCorrect: false,
        feedback: `Antwort stimmt nicht mit der erwarteten Lösung überein (${expected}).`,
      };
    }

    if (answerType === AnswerType.MATCHING) {
      const expectedMatches = question.correctMatches ?? {};
      const provided = typeof rawAnswer === 'object' ? rawAnswer : {};

      const expectedKeys = Object.keys(expectedMatches);
      if (expectedKeys.length === 0) {
        return { score: 0, isCorrect: false, feedback: 'Keine Referenzlösung vorhanden.' };
      }

      const correctMatches = expectedKeys.filter(key => provided?.[key] === expectedMatches[key])
        .length;
      const score = correctMatches / expectedKeys.length;
      const isCorrect = correctMatches === expectedKeys.length;

      return {
        score,
        isCorrect,
        feedback: isCorrect
          ? 'Alle Zuordnungen korrekt.'
          : `${correctMatches} von ${expectedKeys.length} Zuordnungen korrekt.`,
      };
    }

    return {
      score: 0,
      isCorrect: false,
      feedback: 'Automatische Bewertung für diesen Fragetyp ist nicht verfügbar.',
    };
  }

  private calculateSimilarity(source: string, target: string): number {
    if (!source.length && !target.length) return 1;
    const matrix: number[][] = Array.from({ length: source.length + 1 }, () => []);

    for (let i = 0; i <= source.length; i += 1) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= target.length; j += 1) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= source.length; i += 1) {
      for (let j = 1; j <= target.length; j += 1) {
        if (source[i - 1] === target[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[source.length][target.length];
    const maxLen = Math.max(source.length, target.length);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
  }
}

class AIMarker implements Marker {
  id: MarkerId = 'ai';

  async mark(context: MarkerContext): Promise<QuestionResult> {
    const metadata = getQuestionMetadata(context.metadataType);
    return markQuestionWithAI({
      question: context.question,
      answer: context.answer,
      metadata,
    });
  }
}

class ManualMarker implements Marker {
  id: MarkerId = 'manual';

  async mark({ question, answer }: MarkerContext): Promise<QuestionResult> {
    const basePoints = question.points ?? 0;
    return {
      questionId: question.id,
      question,
      userAnswer: answer,
      score: 0,
      maxScore: basePoints,
      isCorrect: false,
      feedback: 'Antwort wurde gespeichert und wartet auf manuelle Bewertung.',
      markedBy: 'manual',
    };
  }
}

class QuestionMarkerRegistry {
  private markers: Map<MarkerId, Marker>;

  constructor() {
    this.markers = new Map([
      ['automatic', new AutomaticMarker()],
      ['ai', new AIMarker()],
      ['manual', new ManualMarker()],
    ]);
  }

  private resolveMarkerId(metadata: QuestionTypeName, question: Question): MarkerId {
    const registryEntry = getQuestionMetadata(metadata);
    const method = registryEntry.markingMethod ?? MarkingMethod.AUTOMATIC;

    switch (method) {
      case MarkingMethod.MANUAL:
        return 'manual';
      case MarkingMethod.AI_ASSISTED:
        return 'ai';
      case MarkingMethod.AUTOMATIC:
      default:
        return 'automatic';
    }
  }

  async markQuestion(question: Question, answer: UserAnswer): Promise<QuestionResult> {
    if (!question.registryType) {
      throw new Error(`Question ${question.id} is missing registryType metadata`);
    }

    const metadataType = question.registryType as QuestionTypeName;
    const markerId = this.resolveMarkerId(metadataType, question);
    const marker = this.markers.get(markerId);

    if (!marker) {
      throw new Error(`Marker "${markerId}" nicht registriert`);
    }

    return marker.mark({
      question,
      answer,
      metadataType,
    });
  }

  async markQuestions(
    questions: Question[],
    answers: UserAnswer[]
  ): Promise<QuestionResult[]> {
    const answersMap = new Map(answers.map(entry => [entry.questionId, entry]));
    const results: QuestionResult[] = [];

    for (const question of questions) {
      const existingAnswer = answersMap.get(question.id);
      if (!existingAnswer) {
        const emptyAnswer: UserAnswer = {
          questionId: question.id,
          answer: '',
          timeSpent: 0,
          attempts: 0,
          hintsUsed: 0,
          timestamp: new Date(),
        };
        const result = await this.markQuestion(question, emptyAnswer);
        results.push(result);
      } else {
        const result = await this.markQuestion(question, existingAnswer);
        results.push(result);
      }
    }

    return results;
  }
}

const registry = new QuestionMarkerRegistry();

export async function markQuestion(
  question: Question,
  answer: UserAnswer
): Promise<QuestionResult> {
  return registry.markQuestion(question, answer);
}

export async function markQuestions(
  questions: Question[],
  answers: UserAnswer[]
): Promise<QuestionResult[]> {
  return registry.markQuestions(questions, answers);
}
