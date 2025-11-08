'use client';

import { cn } from '@/lib/utils';

interface MCQCheckboxProps {
  letter?: string;
  checked?: boolean;
  onChange?: () => void;
  disabled?: boolean;
  isExample?: boolean;
  display?: boolean; // Display only mode - non-interactive
  className?: string; // Custom className
  size?: 'sm' | 'msm' | 'md' | 'lg'; // Size presets
  showContent?: boolean; // Whether to show the X or letter
  customContent?: React.ReactNode; // Custom content instead of letter/X
}

export function MCQCheckbox({
  letter = '',
  checked = false,
  onChange,
  disabled = false,
  isExample = false,
  display = false,
  className = '',
  size = 'md',
  showContent = true,
  customContent,
}: MCQCheckboxProps) {
  // Size classes
  const sizeClasses = {
    sm: 'w-3 h-3',
    msm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  // Default styling
  const baseClasses = cn(
    sizeClasses[size],
    'flex items-center justify-center flex-shrink-0 rounded-[4px]',
    'font-bold text-xs font-mono transition-all duration-150',
    checked ? 'bg-primary text-primary-foreground border border-transparent' : 'bg-background text-foreground border border-border',
    !display && 'cursor-pointer',
    display && 'cursor-default',
    !display && !checked && 'hover:bg-muted',
    disabled && !isExample && 'cursor-not-allowed opacity-60',
    isExample && 'opacity-50',
    className
  );

  return (
    <button
      onClick={!display ? onChange : undefined}
      disabled={display || disabled || isExample}
      className={baseClasses}
      type="button"
    >
      {showContent && (
        customContent || (checked ? (
          <span className="text-sm">✕</span>
        ) : (
          letter.toLowerCase()
        ))
      )}
    </button>
  );
}
