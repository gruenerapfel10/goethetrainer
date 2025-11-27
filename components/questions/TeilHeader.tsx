'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Check, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type View = 'fragen' | 'quelle';

interface TeilHeaderProps {
  teilNumbers: number[];
  teilLabels: Record<number, string>;
  teilNumber: number;
  generatedTeils: Set<number>;
  isSubmitting: boolean;
  onTeilNavigate?: (teil: number) => void;
  showSourceToggle?: boolean;
  activeView: View;
  onActiveViewChange: (view: View) => void;
  quelleContent?: ReactNode;
  showA4Format: boolean;
  onToggleA4: () => void;
  highlightSavedWords: boolean;
  onToggleHighlightSavedWords: () => void;
  onEndSession?: () => void;
  onSeeSource: () => void;
  className?: string;
}

export function TeilHeader({
  teilNumbers,
  teilLabels,
  teilNumber,
  generatedTeils,
  isSubmitting,
  onTeilNavigate,
  showSourceToggle = true,
  activeView,
  onActiveViewChange,
  quelleContent,
  showA4Format,
  onToggleA4,
  highlightSavedWords,
  onToggleHighlightSavedWords,
  onEndSession,
  onSeeSource,
  className,
}: TeilHeaderProps) {
  return (
    <div className={cn('px-6 pt-6 space-y-4 z-10 bg-[hsl(var(--content-color))]', className)}>
      <div
        className="grid w-full"
        style={{ gridTemplateColumns: `repeat(${teilNumbers.length}, minmax(0, 1fr))` }}
      >
        {teilNumbers.map((number, index) => {
          const label = teilLabels[number] ?? `Teil ${number}`;
          const isCurrent = number === teilNumber;
          const isAvailable = generatedTeils.has(number) || number === teilNumber;

          return (
            <button
              key={number}
              type="button"
              onClick={() => {
                if (!isCurrent && isAvailable && !isSubmitting) {
                  onTeilNavigate?.(number);
                }
              }}
              disabled={!isAvailable || isSubmitting}
              className={cn(
                'w-full h-full px-4 py-3 text-sm font-medium transition-colors text-center border-b border-border/60 rounded-none bg-transparent',
                isCurrent
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground',
                (!isAvailable || isSubmitting) && 'opacity-40 cursor-not-allowed border-primary/0'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        {showSourceToggle && (
          <div className="flex gap-0 border-b border-border">
            <button
              onClick={() => onActiveViewChange('fragen')}
              className={cn(
                'px-4 py-2 font-medium transition-colors',
                activeView === 'fragen'
                  ? 'text-foreground border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Fragen
            </button>
            <button
              onClick={() => onActiveViewChange('quelle')}
              className={cn(
                'px-4 py-2 font-medium transition-colors',
                activeView === 'quelle'
                  ? 'text-foreground border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              disabled={!quelleContent}
            >
              Quelle
            </button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors rounded"
              aria-label="Settings"
              disabled={isSubmitting}
            >
              <Settings className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-border/30 rounded-xl bg-muted w-48"
            sideOffset={4}
          >
            <DropdownMenuItem
              onSelect={event => {
                event.preventDefault();
                onToggleA4();
              }}
              className="flex justify-between items-center gap-2 hover:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
            >
              <span>A4 Format</span>
              {showA4Format && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={event => {
                event.preventDefault();
                onToggleHighlightSavedWords();
              }}
              className="flex justify-between items-center gap-2 hover:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
            >
              <span>Gespeicherte Wörter markieren</span>
              {highlightSavedWords && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={event => {
                event.preventDefault();
                onEndSession?.();
              }}
              className="gap-2 hover:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
            >
              End Session
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={event => {
                event.preventDefault();
                onSeeSource();
              }}
              className="gap-2 hover:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
              disabled={isSubmitting}
            >
              See source
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
