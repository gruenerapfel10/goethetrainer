'use client';

import { cn } from '@/lib/utils';

interface MCQCheckboxProps {
  letter: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  isExample: boolean;
}

export function MCQCheckbox({
  letter,
  checked,
  onChange,
  disabled,
  isExample,
}: MCQCheckboxProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled || isExample}
      className={cn(
        'w-6 h-6 border flex items-center justify-center flex-shrink-0',
        'font-bold text-xs font-mono transition-all',
        'cursor-pointer',
        !checked ? 'border-input bg-background hover:bg-muted' : 'border-primary bg-background text-primary hover:bg-primary/10',
        isExample && 'border-input bg-muted text-muted-foreground cursor-default',
        disabled && !isExample && 'cursor-not-allowed opacity-60'
      )}
      type="button"
    >
      {checked ? (
        <span className="text-sm">✕</span>
      ) : (
        letter.toLowerCase()
      )}
    </button>
  );
}
