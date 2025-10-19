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
        'w-10 h-10 rounded-md border-2 flex items-center justify-center flex-shrink-0',
        'font-bold text-sm font-mono transition-all',
        'cursor-pointer',
        // Default state
        !checked && !showFeedback && 'border-gray-400 bg-white hover:border-gray-600',
        // Selected state
        !showFeedback && checked && !isExample && 'border-blue-600 bg-blue-600 text-white',
        // Example state (always unchecked but greyed out)
        isExample && !showFeedback && 'border-gray-300 bg-gray-100 text-gray-500 cursor-default',
        // Correct answer
        showCorrect && 'border-green-600 bg-green-600 text-white',
        // Incorrect answer
        showIncorrect && 'border-red-600 bg-red-600 text-white',
        // Disabled state
        disabled && !isExample && 'cursor-not-allowed opacity-60'
      )}
      type="button"
    >
      {showFeedback && checked && !isCorrect ? (
        <span className="text-lg">✗</span>
      ) : showFeedback && isCorrect ? (
        <span className="text-lg">✓</span>
      ) : (
        letter.toUpperCase()
      )}
    </button>
  );
}
