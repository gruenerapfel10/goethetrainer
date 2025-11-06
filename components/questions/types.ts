import type { Question, UserAnswer } from '@/lib/sessions/questions/question-types';

export interface QuestionComponentProps {
  question: Question;
  onAnswer: (answer: string | string[] | boolean | Record<string, string>) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showHint?: boolean;
  currentHintIndex?: number;
  isSubmitted?: boolean;
  userAnswer?: UserAnswer;
  isCorrect?: boolean;
  feedback?: string;
  questionNumber?: number;
  totalQuestions?: number;
}

export interface QuestionHeaderProps {
  questionNumber?: number;
  totalQuestions?: number;
  points: number;
  timeLimit?: number;
  difficulty?: string;
}

export interface QuestionFooterProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isLastQuestion?: boolean;
  isSubmitted?: boolean;
}
