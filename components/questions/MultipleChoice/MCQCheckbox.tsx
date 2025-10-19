'use client';

import { cn } from '@/lib/utils';

interface MCQCheckboxProps {
  letter: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  isExample: boolean;
  isCorrect?: boolean;
  showFeedback?: boolean;
}

export function MCQCheckbox({
  letter,
  checked,
  onChange,
  disabled,
  isExample,
  isCorrect = false,
  showFeedback = false,
}: MCQCheckboxProps) {
  const showCorrect = showFeedback && isCorrect;
  const showIncorrect = showFeedback && checked && !isCorrect;

  return (
    <button
      onClick={onChange}
      disabled={disabled || isExample}
      className={cn(
        'w-6 h-6 border flex items-center justify-center flex-shrink-0',
        'font-bold text-xs font-mono transition-all',
        'cursor-pointer',
        // Default state - no visible border
        !checked && !showFeedback && 'border-input bg-background hover:bg-muted',
        // Selected state
        !showFeedback && checked && !isExample && 'border-primary bg-background text-primary hover:bg-primary/10',
        // Example state (always unchecked but greyed out)
        isExample && !showFeedback && 'border-input bg-muted text-muted-foreground cursor-default',
        // Correct answer
        showCorrect && 'border-success bg-success text-success-foreground',
        // Incorrect answer
        showIncorrect && 'border-destructive bg-destructive text-destructive-foreground',
        // Disabled state
        disabled && !isExample && 'cursor-not-allowed opacity-60'
      )}
      type="button"
    >
      {checked && !showFeedback ? (
        <span className="text-sm">✕</span>
      ) : showFeedback && checked && !isCorrect ? (
        <span className="text-sm">✗</span>
      ) : showFeedback && isCorrect ? (
        <span className="text-sm">✓</span>
      ) : isExample && isCorrect && !showFeedback ? (
        <span className="text-sm">✕</span>
      ) : (
        letter.toLowerCase()
      )}
    </button>
  );
}
