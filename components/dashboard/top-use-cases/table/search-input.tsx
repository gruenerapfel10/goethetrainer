'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  autoFocus = false,
}: SearchInputProps) {
  const t = useTranslations('dashboard.topUseCases');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle auto-focus if specified
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div
      className={cn(
        "flex items-center relative bg-background border rounded-md overflow-hidden",
        "focus-within:ring-1 focus-within:ring-ring focus-within:border-input",
        isFocused ? "border-input" : "border-input/50",
        className
      )}
    >
      <Search 
        className={cn(
          "absolute left-2 w-4 h-4", 
          isFocused || value ? "text-foreground/70" : "text-muted-foreground/50"
        )} 
      />
      
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder || t('search.placeholder')}
        className={cn(
          "border-0 pl-8 h-9 focus-visible:ring-0 bg-transparent",
          !value && "placeholder:text-muted-foreground/50"
        )}
      />
      
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground"
          aria-label={t('search.clear')}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
} 