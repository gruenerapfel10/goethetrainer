'use client';

import { useState, useRef, useEffect } from 'react';
import type { CardTemplate } from '@/lib/flashcards/types';
import { CursorManager } from '@/components/multimodal-input/cursor-manager';

interface FlashcardProps {
  card: CardTemplate;
  isFlipped?: boolean;
  onFlip?: (isFlipped: boolean) => void;
  showHint?: boolean;
  building?: boolean;
  onFrontChange?: (value: string) => void;
  onBackChange?: (value: string) => void;
  containerClassName?: string;
}

export function Flashcard({
  card,
  isFlipped = false,
  onFlip,
  showHint = false,
  building = false,
  onFrontChange,
  onBackChange,
  containerClassName,
}: FlashcardProps) {
  const [flipped, setFlipped] = useState(isFlipped);
  const frontEditorRef = useRef<HTMLDivElement>(null);
  const backEditorRef = useRef<HTMLDivElement>(null);
  const frontCursorRef = useRef<CursorManager | null>(null);
  const backCursorRef = useRef<CursorManager | null>(null);

  useEffect(() => {
    setFlipped(isFlipped);
  }, [isFlipped]);

  const insertLineBreak = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      document.execCommand('insertLineBreak');
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const br = document.createElement('br');
    range.insertNode(br);
    range.setStartAfter(br);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleEditableKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      insertLineBreak();
    }
  };

  // Initialize cursor managers on mount
  useEffect(() => {
    if (frontEditorRef.current && !frontCursorRef.current) {
      frontCursorRef.current = new CursorManager(frontEditorRef.current);
    }
    if (backEditorRef.current && !backCursorRef.current) {
      backCursorRef.current = new CursorManager(backEditorRef.current);
    }
  }, []);

  useEffect(() => {
    if (!building) {
      return;
    }
    const frontEl = frontEditorRef.current;
    if (!frontEl) {
      return;
    }
    if (document.activeElement === frontEl) {
      return;
    }
    const nextValue = card.front ?? '';
    if (frontEl.textContent !== nextValue) {
      frontEl.textContent = nextValue;
    }
  }, [card.front, building]);

  useEffect(() => {
    if (!building) {
      return;
    }
    const backEl = backEditorRef.current;
    if (!backEl) {
      return;
    }
    if (document.activeElement === backEl) {
      return;
    }
    const nextValue = card.back ?? '';
    if (backEl.textContent !== nextValue) {
      backEl.textContent = nextValue;
    }
  }, [card.back, building]);

  const handleFlip = (e: React.MouseEvent) => {
    // Don't flip if clicking on editable content in building mode
    if (building && e.currentTarget === e.target) {
      const newFlipped = !flipped;
      setFlipped(newFlipped);
      onFlip?.(newFlipped);
    } else if (!building) {
      const newFlipped = !flipped;
      setFlipped(newFlipped);
      onFlip?.(newFlipped);
    }
  };

  const defaultContainerClass = building
    ? 'w-full min-h-[300px] rounded-3xl bg-muted p-8 flex flex-col items-center justify-center relative'
    : 'w-full h-full min-h-[300px] flex flex-col items-center justify-center';

  const containerClass = containerClassName || defaultContainerClass;

  const labelClass = building
    ? 'text-xs uppercase tracking-[0.35em] text-muted-foreground'
    : 'text-xs uppercase tracking-[0.35em] text-muted-foreground group-hover:text-primary/70 transition';

  const contentClass = building
    ? 'text-3xl font-semibold text-foreground text-center max-w-2xl break-words'
    : 'text-3xl font-semibold text-foreground text-center max-w-2xl break-words line-clamp-5';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div
        role={!building ? 'button' : undefined}
        tabIndex={!building ? 0 : -1}
        onClick={handleFlip}
        onKeyDown={event => {
          if (!building && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            handleFlip(event as any);
          }
        }}
        className={containerClass}
      >
        {building && (
          <div className="absolute right-4 top-4 flex gap-2 rounded-full bg-background/80 p-1 shadow-sm">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${!flipped ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              onClick={event => {
                event.stopPropagation();
                setFlipped(false);
                onFlip?.(false);
              }}
            >
              Prompt
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${flipped ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              onClick={event => {
                event.stopPropagation();
                setFlipped(true);
                onFlip?.(true);
              }}
            >
              Answer
            </button>
          </div>
        )}
        {/* Main content */}
        {building ? (
          <div className="relative flex justify-center">
            <div
              key="front"
              ref={frontEditorRef}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={handleEditableKeyDown}
              onInput={(e) => {
                const text = e.currentTarget.textContent || '';
                onFrontChange?.(text);

                if (frontCursorRef.current) {
                  requestAnimationFrame(() => {
                    if (frontEditorRef.current && frontCursorRef.current) {
                      const cursorPos = frontCursorRef.current.getCursorPosition();
                      const fileMap = new Map<string, { url: string }>();
                      frontCursorRef.current.syncHtmlFromText(text, fileMap);
                      frontCursorRef.current.setCursorPosition(cursorPos);
                    }
                  });
                }
              }}
              className={`inline-block max-w-2xl text-3xl font-semibold text-foreground text-center break-words whitespace-pre-wrap outline-none focus:ring-2 focus:ring-primary/40 px-4 py-3 rounded border-2 border-dashed border-primary/30 empty:before:content-['PROMPT'] empty:before:text-muted-foreground empty:before:opacity-60 transition ${flipped ? 'hidden' : 'block'}`}
              role="textbox"
              aria-label="Prompt"
            />
            <div
              key="back"
              ref={backEditorRef}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={handleEditableKeyDown}
              onInput={(e) => {
                const text = e.currentTarget.textContent || '';
                onBackChange?.(text);

                if (backCursorRef.current) {
                  requestAnimationFrame(() => {
                    if (backEditorRef.current && backCursorRef.current) {
                      const cursorPos = backCursorRef.current.getCursorPosition();
                      const fileMap = new Map<string, { url: string }>();
                      backCursorRef.current.syncHtmlFromText(text, fileMap);
                      backCursorRef.current.setCursorPosition(cursorPos);
                    }
                  });
                }
              }}
              className={`inline-block max-w-2xl text-3xl font-semibold text-foreground text-center break-words whitespace-pre-wrap outline-none focus:ring-2 focus:ring-primary/40 px-4 py-3 rounded border-2 border-dashed border-primary/30 empty:before:content-['ANSWER'] empty:before:text-muted-foreground empty:before:opacity-60 transition ${flipped ? 'block' : 'hidden'}`}
              role="textbox"
              aria-label="Answer"
            />
          </div>
        ) : (
          <p className={contentClass}>
            {flipped ? card.back : card.front}
          </p>
        )}

        {/* Hint (shown when not flipped and showHint is true) */}
        {!flipped && showHint && card.hint && (
          <div className="mt-6 pt-6 border-t border-border/30 w-full">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Hint</p>
            <p className="text-sm text-muted-foreground italic">{card.hint}</p>
          </div>
        )}

        {/* Tags (shown at bottom) */}
        {card.tags && card.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Flip indicator */}
        {!building && (
          <p className="text-xs text-muted-foreground/60 mt-8 group-hover:text-muted-foreground transition">
            Click to {flipped ? 'see prompt' : 'reveal answer'}
          </p>
        )}
      </div>
    </div>
  );
}
