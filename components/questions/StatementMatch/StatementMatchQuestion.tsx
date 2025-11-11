import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { SessionQuestion } from '@/lib/sessions/learning-session-context';
import type { AnswerValue } from '@/lib/sessions/types';
import { MCQCheckbox } from '@/components/questions/MultipleChoice/MCQCheckbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    mode?: string;
    sentencePool?: Array<{ id: string; text: string }>;
  };
  const isSentencePoolMode = presentation?.mode === 'sentence_pool';

  const sentencePoolEntries =
    presentation?.sentencePool && presentation.sentencePool.length > 0
      ? presentation.sentencePool
      : (question.options ?? []).map(option => ({
          id: option.id ?? option.text ?? '',
          text: option.text ?? option.id ?? '',
        }));

  const orderedStatements = useMemo(() => {
    return [...statements].sort((a, b) => {
      const orderA =
        typeof a.number === 'number'
          ? a.number
          : Number.parseInt(a.id.replace(/\D+/g, ''), 10);
      const orderB =
        typeof b.number === 'number'
          ? b.number
          : Number.parseInt(b.id.replace(/\D+/g, ''), 10);
      return (orderA || 0) - (orderB || 0);
    });
  }, [statements]);

  const orderedOptions = useMemo(() => {
    if (!isSentencePoolMode) {
      return options;
    }
    return [...options].sort((a, b) => {
      const label = (value?: string) =>
        value && value !== '0' ? value : value ?? '';
      return label(a.id).localeCompare(label(b.id));
    });
  }, [options, isSentencePoolMode]);

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

  const sentenceAssignments = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    orderedStatements.forEach(statement => {
      const assigned = currentSelections[statement.id];
      if (assigned) {
        map[assigned] = statement.id;
      }
    });
    return map;
  }, [orderedStatements, currentSelections]);

  const correctAssignments = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    Object.entries(correctMatches).forEach(([gapId, sentenceId]) => {
      if (sentenceId) {
        map[sentenceId] = gapId;
      }
    });
    return map;
  }, [correctMatches]);

  const handleSentenceAssign = (sentenceId: string, gapId: string | null) => {
    if (isSubmitted) {
      return;
    }
    const next = { ...currentSelections };
    Object.entries(next).forEach(([gapKey, letter]) => {
      if (letter === sentenceId) {
        delete next[gapKey];
      }
    });
    if (gapId) {
      next[gapId] = sentenceId;
    }
    onAnswer(next);
  };

  const layout = (question.renderConfig as { layout?: string } | undefined)?.layout;
  const isHorizontal =
    layout === 'horizontal' ||
    layout === 'statement_match' ||
    layout === 'single_statement' ||
    !layout;

  if (isSentencePoolMode) {
    return (
      <SentencePoolMatch
        sentences={sentencePoolEntries}
        gaps={orderedStatements}
        sentenceAssignments={sentenceAssignments}
        correctAssignments={correctAssignments}
        onAssign={handleSentenceAssign}
        isSubmitted={isSubmitted}
      />
    );
  }

  return (
    <div className="space-y-6 text-foreground text-sm leading-relaxed">
      {orderedStatements.map(statement => {
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
                  {orderedOptions.map((option, index) => {
                    const optionId = option.id ?? option.text;
                    const isSelected = selected === optionId;
                    const showCorrect = isSubmitted && expected === optionId;
                    const showIncorrect = isSubmitted && isSelected && optionId !== expected;
                    const optionLetter =
                      optionId && optionId.length <= 2
                        ? optionId.toUpperCase()
                        : optionId === '0'
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

interface SentencePoolMatchProps {
  sentences: Array<{ id: string; text: string }>;
  gaps: NonNullable<SessionQuestion['statements']>;
  sentenceAssignments: Record<string, string>;
  correctAssignments: Record<string, string>;
  onAssign: (sentenceId: string, gapId: string | null) => void;
  isSubmitted: boolean;
}

function SentencePoolMatch({
  sentences,
  gaps,
  sentenceAssignments,
  correctAssignments,
  onAssign,
  isSubmitted,
}: SentencePoolMatchProps) {
  const gapLabelMap = useMemo(() => {
    return new Map(gaps.map(gap => [gap.id, gap.number ?? gap.id]));
  }, [gaps]);

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {sentences.map(sentence => {
        const selectedGap = sentenceAssignments[sentence.id] ?? '';
        const correctGap = correctAssignments[sentence.id] ?? '';
        const isCorrect = isSubmitted && selectedGap === correctGap && !!selectedGap;
        const isIncorrect = isSubmitted && !!selectedGap && selectedGap !== correctGap;

        return (
          <div key={sentence.id} className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="font-bold text-base min-w-[32px] text-right">{sentence.id}</div>
              <p className="flex-1 whitespace-pre-line text-foreground">{sentence.text}</p>
            </div>
            <div className="pl-9 max-w-xs">
              <Select
                value={selectedGap || 'NONE'}
                onValueChange={value => onAssign(sentence.id, value === 'NONE' ? null : value)}
                disabled={isSubmitted}
              >
                <SelectTrigger
                  className={cn(
                    'h-10',
                    isCorrect && 'border-emerald-500 bg-emerald-50 text-emerald-800',
                    isIncorrect && 'border-red-500 bg-red-50 text-red-700'
                  )}
                >
                  <SelectValue placeholder="Lücke wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Keine Zuordnung</SelectItem>
                  {gaps.map(gap => (
                    <SelectItem key={`${sentence.id}-${gap.id}`} value={gap.id}>
                      {gapLabelMap.get(gap.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isSubmitted && correctGap && (
              <p className="pl-9 text-xs text-muted-foreground">
                Richtige Lücke: {gapLabelMap.get(correctGap) ?? correctGap}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
