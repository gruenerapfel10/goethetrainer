import { Question, QuestionResult, UserAnswer } from './question-types';

interface QuestionMetadata {
  defaultPoints?: number;
}

interface AIMarkingContext {
  question: Question;
  answer: UserAnswer;
  metadata: QuestionMetadata;
}

interface KeywordAnalysis {
  keywordsFound: number;
  keywordsTotal: number;
  coverage: number;
}

function analyseKeywords(answerText: string, keywords?: string[]): KeywordAnalysis {
  if (!keywords || keywords.length === 0) {
    return { keywordsFound: 0, keywordsTotal: 0, coverage: 0 };
  }

  const lowerAnswer = answerText.toLowerCase();
  const matches = keywords.filter(keyword =>
    lowerAnswer.includes(keyword.toLowerCase())
  );

  return {
    keywordsFound: matches.length,
    keywordsTotal: keywords.length,
    coverage: matches.length / keywords.length,
  };
}

function scoreByLength(answerText: string, minWords: number, targetWords: number): number {
  const words = answerText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (wordCount === 0) return 0;

  if (wordCount < minWords) {
    return 0.3;
  }

  if (wordCount >= targetWords) {
    return 1;
  }

  const ratio = (wordCount - minWords) / (targetWords - minWords);
  return 0.3 + ratio * 0.7;
}

export async function markQuestionWithAI({
  question,
  answer,
  metadata,
}: AIMarkingContext): Promise<QuestionResult> {
  const basePoints = question.points ?? metadata.defaultPoints ?? 0;
  const answerText = String(answer.answer ?? '').trim();

  if (!answerText) {
    return {
      questionId: question.id,
      question,
      userAnswer: answer,
      score: 0,
      maxScore: basePoints,
      isCorrect: false,
      feedback: 'Keine Antwort eingereicht. Bitte beantworte die Frage, um eine Bewertung zu erhalten.',
      markedBy: 'ai',
    };
  }

  const minWords = question.scoringCriteria?.rubric?.minimum_words ?? 50;
  const targetWords = question.scoringCriteria?.rubric?.target_words ?? 120;

  const lengthScore = scoreByLength(answerText, minWords, targetWords);
  const keywordAnalysis = analyseKeywords(answerText, question.scoringCriteria?.keywords);

  let aggregateScore = lengthScore;

  if (keywordAnalysis.keywordsTotal > 0) {
    aggregateScore = aggregateScore * 0.7 + keywordAnalysis.coverage * 0.3;
  }

  if (question.scoringCriteria?.requireExactMatch) {
    const expected = String(question.correctAnswer ?? '').trim().toLowerCase();
    const isExactMatch = answerText.toLowerCase() === expected;
    aggregateScore = isExactMatch ? 1 : 0;
  }

  const finalScore = Math.round(Math.min(1, Math.max(0, aggregateScore)) * basePoints);
  const isCorrect = finalScore >= basePoints * 0.7;

  const feedbackSegments: string[] = [];

  if (lengthScore >= 0.9) {
    feedbackSegments.push('Umfang der Antwort ist sehr gut.');
  } else if (lengthScore >= 0.6) {
    feedbackSegments.push('Der Umfang passt, könnte aber noch ausführlicher sein.');
  } else {
    feedbackSegments.push(`Antwort ist zu kurz. Visierter Umfang: mindestens ${minWords} Wörter.`);
  }

  if (keywordAnalysis.keywordsTotal > 0) {
    if (keywordAnalysis.coverage === 1) {
      feedbackSegments.push('Alle geforderten Schlüsselbegriffe wurden verwendet.');
    } else if (keywordAnalysis.coverage >= 0.5) {
      feedbackSegments.push('Mehr als die Hälfte der Schlüsselbegriffe wurden verwendet.');
    } else {
      feedbackSegments.push('Es fehlen wichtige Schlüsselbegriffe in der Antwort.');
    }
  }

  if (question.scoringCriteria?.requireExactMatch && !isCorrect) {
    feedbackSegments.push('Die Antwort entspricht nicht exakt der erwarteten Lösung.');
  }

  return {
    questionId: question.id,
    question,
    userAnswer: answer,
    score: finalScore,
    maxScore: basePoints,
    isCorrect,
    feedback: feedbackSegments.join(' '),
    markedBy: 'ai',
  };
}
