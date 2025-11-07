import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { GoetheHeader } from '@/components/questions/MultipleChoice/GoetheHeader';
import type { SessionQuestion } from '@/lib/sessions/learning-session-context';
import type { AnswerValue } from '@/lib/sessions/types';

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
  const presentation = (question.presentation ?? {}) as {
    workingTimeMinutes?: number;
    intro?: string;
    example?: {
      statement: string;
      answer: string;
      explanation?: string;
    };
  };
  const workingTime = presentation.workingTimeMinutes ?? 15;
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

  return (
    <div className="space-y-8 text-gray-900 text-sm leading-relaxed">
      <div className="flex justify-center">
        <GoetheHeader />
      </div>

      <div className="flex justify-between font-semibold">
        <span>{question.layoutLabel ?? 'Teil 4'}</span>
        <span>Vorgeschlagene Arbeitszeit: {workingTime} Minuten</span>
      </div>

      <div className="space-y-2">
        <p className="whitespace-pre-line">{question.prompt}</p>
        {presentation.intro && (
          <p className="whitespace-pre-line">{presentation.intro}</p>
        )}
      </div>

      {presentation.example && (
        <div className="space-y-1">
          <div className="flex items-center justify-between font-semibold">
            <span>Beispiel</span>
            <span>Lösung: {presentation.example.answer}</span>
          </div>
          <p>{presentation.example.statement}</p>
          {presentation.example.explanation && (
            <p className="text-xs text-gray-600">{presentation.example.explanation}</p>
          )}
        </div>
      )}

      <div className="space-y-3 border-t border-gray-300 pt-4">
        {statements.map(statement => {
          const selected = currentSelections[statement.id] ?? '';
          const expected = correctMatches[statement.id];
          const isCorrect = isSubmitted && selected === expected;
          const isIncorrect = isSubmitted && !!selected && selected !== expected;

          return (
            <div
              key={statement.id}
              className={cn(
                'flex items-start gap-4 py-2',
                isCorrect && 'text-green-700',
                isIncorrect && 'text-red-600'
              )}
            >
              <span className="font-semibold min-w-[32px] text-right">
                {statement.number ?? statement.id}
              </span>
              <p className="flex-1">{statement.text}</p>
              <div className="flex gap-2">
                {options.map(option => {
                  const optionId = option.id ?? option.text;
                  const isSelected = selected === optionId;
                  const showCorrect = isSubmitted && expected === optionId;
                  const showIncorrect = isSubmitted && isSelected && optionId !== expected;

                  return (
                    <button
                      key={`${statement.id}-${optionId}`}
                      type="button"
                      onClick={() => handleSelect(statement.id, optionId)}
                      disabled={isSubmitted}
                      className={cn(
                        'px-3 py-1 border border-gray-500 text-sm font-semibold',
                        !isSubmitted && isSelected && 'bg-gray-900 text-white border-gray-900',
                        !isSubmitted && !isSelected && 'bg-white text-gray-800 hover:bg-gray-100',
                        showCorrect && 'bg-green-600 text-white border-green-600',
                        showIncorrect && 'bg-red-500 text-white border-red-500',
                        isSubmitted && !showCorrect && !showIncorrect && 'bg-white text-gray-500 border-gray-300 cursor-default'
                      )}
                    >
                      {optionId}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {isSubmitted && feedback && (
        <p className="text-xs text-gray-700">{feedback}</p>
      )}
    </div>
  );
}
