'use client';

import {
  cloneElement,
  isValidElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Check, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { QuestionSourceReference } from '@/lib/sessions/questions/question-types';
import useSWR from 'swr';
import { READING_LIST_UPDATED_EVENT } from '@/lib/reading-list/events';

interface SessionBoardProps {
  teilNumber: number;
  teilLabel: string;
  teilLabels: Record<number, string>;
  totalTeils: number;
  generatedTeils: Set<number>;
  onTeilNavigate?: (teilNumber: number) => void;
  onBack?: () => void;
  showBackButton?: boolean;
  isSubmitting?: boolean;
  isLastTeil?: boolean;
  canSubmit?: boolean;
  onSubmit: () => void;
  activeView: 'fragen' | 'quelle';
  onActiveViewChange: (view: 'fragen' | 'quelle') => void;
  frageContent: ReactNode;
  quelleContent?: ReactNode;
  showSourceToggle?: boolean;
  showA4Format?: boolean;
  onShowA4FormatChange?: (show: boolean) => void;
  onEndSession?: () => void;
  sourceReference?: QuestionSourceReference;
}

export function SessionBoard({
  teilNumber,
  teilLabel,
  teilLabels,
  totalTeils,
  generatedTeils,
  onTeilNavigate,
  onBack,
  showBackButton = false,
  isSubmitting = false,
  isLastTeil = true,
  canSubmit = true,
  onSubmit,
  activeView,
  onActiveViewChange,
  frageContent,
  quelleContent,
  showSourceToggle = true,
  showA4Format = true,
  onShowA4FormatChange,
  onEndSession,
  sourceReference,
}: SessionBoardProps) {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [highlightSavedWords, setHighlightSavedWords] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem('highlightSavedWords') === 'true';
  });
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('highlightSavedWords', highlightSavedWords ? 'true' : 'false');
  }, [highlightSavedWords]);
  const savedWords = useSavedWords(highlightSavedWords);
  const normalizedSavedWords = useMemo(
    () =>
      highlightSavedWords
        ? Array.from(
            new Set(
              savedWords
                .map(word => (typeof word === 'string' ? word.trim() : ''))
                .filter(word => word.length > 0)
            )
          )
        : [],
    [savedWords, highlightSavedWords]
  );
  const teilNumbers = Array.from({ length: totalTeils }, (_, index) => index + 1);
  const handleSubmitClick = () => {
    console.log('[SessionBoard] submit click', {
      teilNumber,
      isLastTeil,
      canSubmit,
      isSubmitting,
    });
    onSubmit();
  };

  const handleToggleA4 = () => {
    onShowA4FormatChange?.(!showA4Format);
  };

  const paperStyle = showA4Format
    ? { width: '210mm', height: '297mm', backgroundColor: 'hsl(var(--sidebar-background))' }
    : undefined;

  const paperClass = cn(
    'w-full h-full flex flex-col dark:bg-background',
    showA4Format ? 'shadow-lg' : 'bg-background rounded-2xl border border-border/60'
  );

  const enhancedQuelleContent =
    activeView === 'quelle' &&
    highlightSavedWords &&
    normalizedSavedWords.length > 0 &&
    quelleContent
      ? (
          <SavedWordHighlighter words={normalizedSavedWords}>
            {quelleContent}
          </SavedWordHighlighter>
        )
      : quelleContent;

  const handleSeeSource = () => {
    if (!sourceReference) {
      toast({
        title: 'Keine Quelle verfügbar',
        description: 'Diese Aufgabe basiert auf generiertem Material ohne externen Artikel.',
      });
      return;
    }

    if (sourceReference.url && typeof window !== 'undefined') {
      window.open(sourceReference.url, '_blank', 'noopener,noreferrer');
      return;
    }

    toast({
      title: sourceReference.title ?? 'Quelle ohne Link',
      description:
        sourceReference.summary ??
        'Diese Quelle wurde intern erzeugt und verweist nicht auf einen externen Artikel.',
    });
  };

  const PaperContent = (
    <div className={paperClass} style={paperStyle}>
      <div className="flex-1 overflow-y-auto px-12 py-10">
        <div className="mb-10">
          <h2 className="text-base font-bold">{teilLabel}</h2>
        </div>
        {activeView === 'fragen' || !showSourceToggle
          ? frageContent
          : enhancedQuelleContent ?? frageContent}
      </div>

      <div className="text-primary-foreground p-6 flex justify-center items-center mt-auto">
        <img
          src={theme === 'dark' ? '/logo_dark.png' : '/logo.png'}
          alt="Goethe-Institut"
          className="h-12 w-auto"
        />
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-background relative">
      {showSourceToggle && (
        <div className="absolute top-6 left-6 flex gap-0 z-10 border-b border-border">
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

      <div className="absolute top-6 right-6 z-10 flex gap-4 items-center">
        <div className="flex gap-2 border-b border-border">
          {teilNumbers.map(number => {
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
                  'px-4 py-2 text-sm font-medium transition-colors',
                  isCurrent
                    ? 'text-foreground border-b-2 border-primary -mb-px'
                    : 'text-muted-foreground hover:text-foreground',
                  (!isAvailable || isSubmitting) && 'opacity-40 cursor-not-allowed'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
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
                handleToggleA4();
              }}
              className="flex justify-between items-center gap-2 hover:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
            >
              <span>A4 Format</span>
              {showA4Format && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={event => {
                event.preventDefault();
                setHighlightSavedWords(prev => !prev);
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
                handleSeeSource();
              }}
              className="gap-2 hover:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
              disabled={isSubmitting}
            >
              See source
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showBackButton && onBack && (
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="absolute bottom-6 left-6 px-4 py-2 bg-muted text-foreground rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-opacity z-10"
        >
          ← Zurück
        </button>
      )}

      <button
        onClick={handleSubmitClick}
        disabled={isSubmitting || !canSubmit}
        className="absolute bottom-6 right-6 px-8 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-medium transition-opacity z-10"
      >
        {isSubmitting ? 'Wird gespeichert…' : isLastTeil ? 'Test abgeben' : 'Weiter'}
      </button>

      {showA4Format ? (
        <div className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-sidebar">
          {PaperContent}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-background px-6 py-4">
          {PaperContent}
        </div>
      )}
    </div>
  );
}

type HighlightPattern = {
  regexSource: string;
};

function useSavedWords(enabled: boolean): string[] {
  const fetcher = (url: string) =>
    fetch(url, { credentials: 'include' }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to load reading list entries');
      }
      return response.json();
    });

  const { data, mutate } = useSWR<{ items: Array<{ text: string }> }>(
    enabled ? '/api/reading-list?limit=50' : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handler = () => mutate();
    window.addEventListener(READING_LIST_UPDATED_EVENT, handler);
    return () => window.removeEventListener(READING_LIST_UPDATED_EVENT, handler);
  }, [enabled, mutate]);

  return data?.items?.map(entry => entry.text) ?? [];
}

function SavedWordHighlighter({
  words,
  children,
}: {
  words: string[];
  children: ReactNode;
}) {
  const patterns = useMemo<HighlightPattern[]>(
    () =>
      words.map(word => ({
        regexSource: escapeRegExp(word),
      })),
    [words]
  );

  const highlighted = useMemo(
    () => applyHighlight(children, patterns, 'saved-word'),
    [children, patterns]
  );

  return <>{highlighted}</>;
}

function applyHighlight(
  node: ReactNode,
  patterns: HighlightPattern[],
  keyPrefix: string
): ReactNode {
  if (!node || patterns.length === 0) {
    return node;
  }

  if (typeof node === 'string') {
    return highlightString(node, patterns, keyPrefix);
  }

  if (typeof node === 'number' || typeof node === 'boolean') {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((child, index) =>
      applyHighlight(child, patterns, `${keyPrefix}-${index}`)
    );
  }

  if (isValidElement(node)) {
    const highlightedChildren = applyHighlight(
      node.props.children,
      patterns,
      `${keyPrefix}-${node.key ?? 'child'}`
    );
    if (highlightedChildren === node.props.children) {
      return node;
    }
    return cloneElement(node, { key: node.key ?? keyPrefix }, highlightedChildren);
  }

  return node;
}

function highlightString(
  value: string,
  patterns: HighlightPattern[],
  keyPrefix: string
): ReactNode {
  let segments: ReactNode[] = [value];
  patterns.forEach((pattern, patternIndex) => {
    segments = segments.flatMap((segment, segmentIndex) => {
      if (typeof segment !== 'string') {
        return [segment];
      }
      const regex = new RegExp(`(${pattern.regexSource})`, 'gi');
      const parts = segment.split(regex);
      if (parts.length === 1) {
        return [segment];
      }
      const result: ReactNode[] = [];
      parts.forEach((part, partIndex) => {
        if (!part) {
          return;
        }
        const isMatch = partIndex % 2 === 1;
        if (isMatch) {
          result.push(
            <mark
              key={`${keyPrefix}-${patternIndex}-${segmentIndex}-${partIndex}`}
              className="bg-primary text-background px-0.5"
              data-saved-word
            >
              {part}
            </mark>
          );
        } else {
          result.push(part);
        }
      });
      return result.length > 0 ? result : [segment];
    });
  });

  return segments.length === 1 ? segments[0] : segments;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
