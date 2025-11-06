import { TrueFalse } from '@/components/questions/TrueFalse/TrueFalse';
import type { QuestionInputComponent } from '../types';

export const TrueFalseInput: QuestionInputComponent = ({
  question,
  value,
  onChange,
  onNext,
  onPrevious,
  feedback,
  position,
}) => {
  const normalisedValue =
    typeof value === 'boolean'
      ? value
      : typeof value === 'string'
        ? value.toLowerCase() === 'true'
        : null;

  return (
    <TrueFalse
      question={{
        ...question,
        answer: normalisedValue,
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
