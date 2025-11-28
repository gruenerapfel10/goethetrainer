'use client';

import {
  cloneElement,
  isValidElement,
  type ReactNode,
  useRef,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { QuestionSourceReference } from '@/lib/sessions/questions/question-types';
import useSWR from 'swr';
import { READING_LIST_UPDATED_EVENT } from '@/lib/reading-list/events';
import { TeilHeader } from './TeilHeader';

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
  const { toast } = useToast();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [highlightSavedWords, setHighlightSavedWords] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    const stored = window.localStorage.getItem('highlightSavedWords');
    return stored === null ? true : stored === 'true';
  });
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('highlightSavedWords', highlightSavedWords ? 'true' : 'false');
  }, [highlightSavedWords]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = headerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      document.documentElement.style.setProperty('--page-header-offset', `${rect.height}px`);
    };

    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    update();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--page-header-offset');
    };
  }, []);
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

  const isSourceView = activeView === 'quelle' && showSourceToggle;

  const paperStyle =
    showA4Format && !isSourceView
      ? { width: '210mm', height: '297mm', backgroundColor: 'hsl(var(--sidebar-background))' }
      : showA4Format
        ? { width: '210mm', backgroundColor: 'hsl(var(--sidebar-background))' }
        : undefined;

  const paperClass = cn(
    'w-full flex flex-col dark:bg-background',
    showA4Format ? 'shadow-lg' : 'bg-background rounded-2xl border border-border/60'
  );

  const shouldHighlight = highlightSavedWords && normalizedSavedWords.length > 0;
  const enhancedQuelleContent =
    activeView === 'quelle' && shouldHighlight && quelleContent
      ? (
          <SavedWordHighlighter words={normalizedSavedWords}>
            {quelleContent}
          </SavedWordHighlighter>
        )
      : quelleContent;
  const enhancedFrageContent =
    activeView === 'fragen' && shouldHighlight && frageContent
      ? (
          <SavedWordHighlighter words={normalizedSavedWords}>
            {frageContent}
          </SavedWordHighlighter>
        )
      : frageContent;

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

  useEffect(() => {
    const node = headerRef.current;
    if (!node) {
      return;
    }
    const updateOffset = () => {
      document.documentElement.style.setProperty('--page-header-offset', `${node.offsetHeight}px`);
    };
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(node);
    window.addEventListener('resize', updateOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateOffset);
      document.documentElement.style.removeProperty('--page-header-offset');
    };
  }, []);

  const PaperContent = (
    <div className={paperClass} style={paperStyle}>
      <div className="flex-1 overflow-visible px-12 py-10 pt-[var(--page-header-offset,0px)]">
        {activeView === 'fragen' || !showSourceToggle
          ? enhancedFrageContent ?? frageContent
          : enhancedQuelleContent ?? frageContent}
      </div>

    </div>
  );

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-transparent relative">
      <div ref={headerRef}>
        <TeilHeader
          teilNumbers={teilNumbers}
          teilLabels={teilLabels}
          teilNumber={teilNumber}
          generatedTeils={generatedTeils}
          isSubmitting={isSubmitting}
          onTeilNavigate={onTeilNavigate}
          showSourceToggle={showSourceToggle}
          activeView={activeView}
          onActiveViewChange={onActiveViewChange}
          quelleContent={quelleContent}
          showA4Format={showA4Format}
          onToggleA4={handleToggleA4}
          highlightSavedWords={highlightSavedWords}
          onToggleHighlightSavedWords={() => setHighlightSavedWords(prev => !prev)}
          onEndSession={onEndSession}
          onSeeSource={handleSeeSource}
        />
      </div>

      {showA4Format ? (
        <div className="flex-1 flex items-start justify-center bg-gray-200 dark:bg-sidebar overflow-y-auto scrollbar-hide">
          {PaperContent}
        </div>
      ) : (
        <div className="flex-1 bg-background px-6 py-4 overflow-y-auto scrollbar-hide">
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
    enabled ? '/api/reading-list?limit=500' : null,
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
      words
        .map(word => word.trim())
        .filter(Boolean)
        .map(word => {
          // Escape regex tokens, then collapse internal whitespace so highlights survive wrapping.
          const escaped = escapeRegExp(word);
          const collapsed = escaped.replace(/\s+/g, '\\s+');
          // Match the word plus any trailing letters (for inflections), with a non-letter boundary in front.
          const withBoundaries = `(^|[^\\p{L}])(${collapsed}[\\p{L}]*)`;
          return { regexSource: withBoundaries };
        }),
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
      const regex = new RegExp(pattern.regexSource, 'giu');
      const result: ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      // Manual walk so we can keep boundary characters out of the highlight
      while ((match = regex.exec(segment)) !== null) {
        const [full, boundary, matched] = match;
        const start = match.index;
        const end = start + full.length;

        if (start > lastIndex) {
          result.push(segment.slice(lastIndex, start));
        }
        if (boundary) {
          result.push(boundary);
        }
        result.push(
          <mark
            key={`${keyPrefix}-${patternIndex}-${segmentIndex}-${start}`}
            className="bg-foreground text-background px-1 rounded-sm font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
            data-saved-word
          >
            {matched}
          </mark>
        );
        lastIndex = end;
      }

      if (lastIndex < segment.length) {
        result.push(segment.slice(lastIndex));
      }

      return result.length > 0 ? result : [segment];
    });
  });

  return segments.length === 1 ? segments[0] : segments;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
