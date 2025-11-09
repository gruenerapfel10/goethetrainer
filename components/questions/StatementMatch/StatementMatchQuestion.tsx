import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { SessionQuestion } from '@/lib/sessions/learning-session-context';
import type { AnswerValue } from '@/lib/sessions/types';
import { MCQCheckbox } from '@/components/questions/MultipleChoice/MCQCheckbox';

interface StatementMatchQuestionProps {
  question: SessionQuestion;
  value: AnswerValue;
  onAnswer: (value: Record<string, string>) => void;
  isSubmitted?: boolean;
  feedback?: string;
}

export function StatementMatchQuestion({
  question,
  value,
  onAnswer,
  isSubmitted = false,
  feedback,
}: StatementMatchQuestionProps) {
  const statements = question.statements ?? [];
  const options = question.options ?? [];
  const correctMatches = question.correctMatches ?? {};

  const currentSelections = useMemo<Record<string, string>>(() => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, string>;
    }
    if (question.answer && typeof question.answer === 'object' && !Array.isArray(question.answer)) {
      return question.answer as Record<string, string>;
    }
    return {};
  }, [value, question.answer]);

  const handleSelect = (statementId: string, optionId: string) => {
    if (isSubmitted) {
      return;
    }
    const next = { ...currentSelections, [statementId]: optionId };
    onAnswer(next);
  };

  const layout = (question.renderConfig as { layout?: string } | undefined)?.layout;
  const isHorizontal =
    layout === 'horizontal' ||
    layout === 'statement_match' ||
    layout === 'single_statement' ||
    !layout;

  return (
    <div className="space-y-6 text-foreground text-sm leading-relaxed">
      {statements.map(statement => {
        const selected = currentSelections[statement.id] ?? '';
        const expected = correctMatches[statement.id];
        const isCorrect = isSubmitted && selected === expected;
        const isIncorrect = isSubmitted && !!selected && selected !== expected;

        return (
          <div
            key={statement.id}
            className="pb-3"
          >
            <div className="grid grid-cols-[minmax(28px,40px)_1fr] gap-4">
              <div className="font-bold text-sm text-right pt-1">
                {statement.number ?? statement.id}
              </div>
              <div className="space-y-3">
                <p className="text-base text-foreground">{statement.text}</p>
                <div
                  className={cn(
                    isHorizontal ? 'flex flex-wrap gap-6' : 'flex flex-col gap-3'
                  )}
                >
                  {options.map((option, index) => {
                    const optionId = option.id ?? option.text;
                    const isSelected = selected === optionId;
                    const showCorrect = isSubmitted && expected === optionId;
                    const showIncorrect = isSubmitted && isSelected && optionId !== expected;
                    const optionLetter =
                      optionId === '0'
                        ? '0'
                        : String.fromCharCode(65 + index);

                    return (
                      <label
                        key={`${statement.id}-${optionId}`}
                        className={cn(
                          'flex items-center gap-2 cursor-pointer text-sm transition-colors min-w-[160px]',
                          !isSubmitted && isSelected && 'text-primary',
                          showCorrect && 'text-emerald-600',
                          showIncorrect && 'text-red-600'
                        )}
                        onClick={() => handleSelect(statement.id, optionId)}
                      >
                        <MCQCheckbox
                          letter={optionLetter}
                          checked={isSelected}
                          onChange={() => handleSelect(statement.id, optionId)}
                          disabled={isSubmitted}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {isSubmitted && feedback && (
        <p className="text-xs text-muted-foreground">{feedback}</p>
      )}
    </div>
  );
}
