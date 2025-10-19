import { 
  Question, 
  UserAnswer, 
  QuestionResult,
  AnswerType 
} from './question-types';

/**
 * Centralized question marking/scoring algorithms
 */

export interface MarkingAlgorithm {
  name: string;
  version: string;
  mark(question: Question, answer: UserAnswer): Promise<QuestionResult>;
}

/**
 * Automatic marking for objective questions
 */
class AutomaticMarker implements MarkingAlgorithm {
  name = 'automatic';
  version = '1.0.0';

  async mark(question: Question, answer: UserAnswer): Promise<QuestionResult> {
    let score = 0;
    let isCorrect = false;
    let feedback = '';

    switch (question.answerType) {
      case AnswerType.GAP_TEXT_MULTIPLE_CHOICE:
        isCorrect = this.markMultipleChoice(question, answer.answer as string);
        score = isCorrect ? question.points : 0;
        if (isCorrect) {
          feedback = 'Correct! Well done.';
        } else {
          // Find the correct option text
          const correctOption = question.options?.find(
            opt => opt.id === question.correctOptionId || opt.isCorrect
          );
          feedback = correctOption
            ? `Incorrect. The correct answer is: ${correctOption.text}`
            : 'Incorrect.';
        }
        break;

      case AnswerType.TRUE_FALSE:
        isCorrect = String(answer.answer).toLowerCase() === String(question.correctAnswer).toLowerCase();
        score = isCorrect ? question.points : 0;
        feedback = isCorrect ? 'Correct!' : `Incorrect. The answer is ${question.correctAnswer}.`;
        break;

      case AnswerType.SHORT_ANSWER:
        const result = this.markShortAnswer(question, answer.answer as string);
        isCorrect = result.isCorrect;
        score = result.score;
        feedback = result.feedback;
        break;

      case AnswerType.FILL_BLANK:
        isCorrect = this.markFillBlank(question, answer.answer);
        score = isCorrect ? question.points : 0;
        feedback = isCorrect ? 'All blanks filled correctly!' : 'Some answers are incorrect.';
        break;

      default:
        feedback = 'This question type requires manual or AI marking.';
        break;
    }

    // Apply time bonus/penalty
    const timeBonusMultiplier = this.calculateTimeBonus(question, answer.timeSpent);
    score = Math.round(score * timeBonusMultiplier);

    // Apply hint penalty
    if (answer.hintsUsed > 0) {
      const hintPenalty = answer.hintsUsed * 0.1; // 10% per hint
      score = Math.round(score * (1 - hintPenalty));
    }

    return {
      questionId: question.id,
      question,
      userAnswer: answer,
      score: Math.max(0, score),
      maxScore: question.points,
      isCorrect,
      feedback,
      markedBy: 'automatic'
    };
  }

  private markMultipleChoice(question: Question, answer: string): boolean {
    if (!question.options) return false;

    // Check if question uses correctOptionId field (new format)
    if (question.correctOptionId) {
      return answer === question.correctOptionId;
    }

    // Fallback to isCorrect flag on options (legacy format)
    const selectedOption = question.options.find(opt => opt.id === answer);
    return selectedOption?.isCorrect || false;
  }

  private markShortAnswer(question: Question, answer: string): {
    isCorrect: boolean;
    score: number;
    feedback: string;
  } {
    const userAnswer = answer.toLowerCase().trim();
    const correctAnswer = String(question.correctAnswer).toLowerCase().trim();
    
    if (question.scoringCriteria?.requireExactMatch) {
      const isCorrect = userAnswer === correctAnswer;
      return {
        isCorrect,
        score: isCorrect ? question.points : 0,
        feedback: isCorrect ? 'Correct!' : `Incorrect. Expected: ${question.correctAnswer}`
      };
    }

    // Partial credit based on similarity
    const similarity = this.calculateSimilarity(userAnswer, correctAnswer);
    const score = Math.round(question.points * similarity);
    
    return {
      isCorrect: similarity >= 0.8,
      score,
      feedback: similarity >= 0.8 
        ? 'Correct!' 
        : similarity >= 0.5 
          ? 'Partially correct.' 
          : 'Incorrect.'
    };
  }

  private markFillBlank(question: Question, answer: string | string[] | boolean): boolean {
    if (!question.correctAnswer) return false;
    
    if (Array.isArray(answer) && Array.isArray(question.correctAnswer)) {
      return answer.every((ans, idx) => 
        ans.toLowerCase().trim() === question.correctAnswer[idx].toLowerCase().trim()
      );
    }
    
    return String(answer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
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
    
    return matrix[str2.length][str1.length];
  }

  private calculateTimeBonus(question: Question, timeSpent: number): number {
    if (!question.timeLimit) return 1;
    
    const timeRatio = timeSpent / question.timeLimit;
    
    if (timeRatio <= 0.5) return 1.2; // 20% bonus for quick answer
    if (timeRatio <= 1) return 1; // No bonus/penalty
    if (timeRatio <= 1.5) return 0.9; // 10% penalty
    return 0.8; // 20% penalty for very slow
  }
}

/**
 * AI-based marking for subjective questions
 */
class AIMarker implements MarkingAlgorithm {
  name = 'ai';
  version = '1.0.0';

  async mark(question: Question, answer: UserAnswer): Promise<QuestionResult> {
    // Placeholder AI marking
    // In production, this would call an AI service
    
    const userAnswer = String(answer.answer);
    const wordCount = userAnswer.split(/\s+/).filter(w => w.length > 0).length;
    
    // Mock scoring based on answer length and keywords
    let score = 0;
    let feedback = '';
    
    if (question.answerType === AnswerType.LONG_ANSWER) {
      // Check minimum word count
      if (wordCount < 50) {
        score = question.points * 0.3;
        feedback = 'Your answer is too short. Try to elaborate more.';
      } else if (wordCount < 100) {
        score = question.points * 0.6;
        feedback = 'Good effort, but could use more detail.';
      } else {
        score = question.points * 0.85;
        feedback = 'Well-written answer with good detail.';
      }
      
      // Check for keywords
      if (question.scoringCriteria?.keywords) {
        const keywordsFound = question.scoringCriteria.keywords.filter(keyword =>
          userAnswer.toLowerCase().includes(keyword.toLowerCase())
        );
        
        const keywordBonus = keywordsFound.length / question.scoringCriteria.keywords.length;
        score = Math.round(score * (1 + keywordBonus * 0.15));
        
        if (keywordsFound.length > 0) {
          feedback += ` You included ${keywordsFound.length} key concepts.`;
        }
      }
    } else if (question.answerType === AnswerType.AUDIO_RECORDING) {
      // Mock scoring for audio
      score = question.points * 0.75;
      feedback = 'Audio processed. Pronunciation: Good. Fluency: Average.';
    }
    
    return {
      questionId: question.id,
      question,
      userAnswer: answer,
      score: Math.min(question.points, Math.max(0, Math.round(score))),
      maxScore: question.points,
      isCorrect: score >= question.points * 0.7,
      feedback,
      markedBy: 'ai'
    };
  }
}

/**
 * Manual marking placeholder
 */
class ManualMarker implements MarkingAlgorithm {
  name = 'manual';
  version = '1.0.0';

  async mark(question: Question, answer: UserAnswer): Promise<QuestionResult> {
    return {
      questionId: question.id,
      question,
      userAnswer: answer,
      score: 0,
      maxScore: question.points,
      isCorrect: false,
      feedback: 'Awaiting manual review',
      markedBy: 'manual'
    };
  }
}

/**
 * Question Marker Registry
 */
class QuestionMarkerRegistry {
  private markers: Map<string, MarkingAlgorithm> = new Map();
  
  constructor() {
    // Register default markers
    this.markers.set('automatic', new AutomaticMarker());
    this.markers.set('ai', new AIMarker());
    this.markers.set('manual', new ManualMarker());
  }

  async markQuestion(question: Question, answer: UserAnswer): Promise<QuestionResult> {
    // Determine which marker to use
    let markerType = 'automatic';
    
    if (question.answerType === AnswerType.LONG_ANSWER || 
        question.answerType === AnswerType.AUDIO_RECORDING) {
      markerType = 'ai';
    }
    
    const marker = this.markers.get(markerType);
    if (!marker) {
      throw new Error(`Marker ${markerType} not found`);
    }
    
    return marker.mark(question, answer);
  }

  async markQuestions(
    questions: Question[], 
    answers: UserAnswer[]
  ): Promise<QuestionResult[]> {
    const results: QuestionResult[] = [];
    
    for (const question of questions) {
      const answer = answers.find(a => a.questionId === question.id);
      if (!answer) {
        // No answer provided - mark as incorrect
        results.push({
          questionId: question.id,
          question,
          userAnswer: {
            questionId: question.id,
            answer: '',
            timeSpent: 0,
            attempts: 0,
            hintsUsed: 0,
            timestamp: new Date()
          },
          score: 0,
          maxScore: question.points,
          isCorrect: false,
          feedback: 'No answer provided',
          markedBy: 'automatic'
        });
      } else {
        results.push(await this.markQuestion(question, answer));
      }
    }
    
    return results;
  }
}

// Global instance
export const questionMarker = new QuestionMarkerRegistry();

// Helper function
export async function markQuestions(
  questions: Question[],
  answers: UserAnswer[]
): Promise<QuestionResult[]> {
  return questionMarker.markQuestions(questions, answers);
}