import { MultipleChoice } from '@/components/questions/MultipleChoice/MultipleChoice';
import type { QuestionInputComponent } from '../types';

export const MultipleChoiceInput: QuestionInputComponent = ({
  question,
  value,
  onChange,
  onNext,
  onPrevious,
  feedback,
  position,
}) => {
  return (
    <MultipleChoice
      question={{
        ...question,
        answer: value as any,
      }}
      onAnswer={onChange}
      onNext={onNext}
      onPrevious={onPrevious}
      isSubmitted={Boolean(feedback)}
      isCorrect={feedback?.isCorrect}
      feedback={feedback?.feedback}
      questionNumber={position?.current}
      totalQuestions={position?.total}
    />
  );
};
