import { ShortAnswer } from '@/components/questions/ShortAnswer/ShortAnswer';
import type { QuestionInputComponent } from '../types';

export const WrittenResponseInput: QuestionInputComponent = ({
  question,
  value,
  onChange,
  onNext,
  onPrevious,
  feedback,
  position,
}) => {
  const stringValue =
    typeof value === 'string'
      ? value
      : value === null || value === undefined
        ? ''
        : String(value ?? '');

  return (
    <ShortAnswer
      question={{
        ...question,
        answer: stringValue,
      }}
      onAnswer={answer => onChange(answer)}
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
