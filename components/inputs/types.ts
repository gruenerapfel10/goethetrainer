import type { QuestionResult } from '@/lib/sessions/questions/question-types';
import type { Question } from '@/lib/sessions/types';
import type { AnswerValue } from '@/lib/sessions/types';

export interface QuestionInputComponentProps {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSubmit?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  feedback?: QuestionResult | null;
  isCurrent?: boolean;
  position?: {
    current: number;
    total: number;
  };
}

export type QuestionInputComponent = (props: QuestionInputComponentProps) => JSX.Element;
