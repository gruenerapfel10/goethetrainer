'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Languages, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { emitReadingListUpdated } from '@/lib/reading-list/events';
import { emitChatPromptRequest } from '@/lib/chat/events';

const MENU_OFFSET = 12;
const MINI_SIZE = { width: 220, height: 56 };
const FULL_SIZE = { width: 320, height: 260 };
const MAX_SELECTION_CHARS = 800;

type Point = { x: number; y: number };
type MenuVariant = 'mini' | 'full';

interface MenuState {
  text: string;
  variant: MenuVariant;
  position: Point;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const computePosition = (anchor: Point, size: { width: number; height: number }) => {
  if (typeof window === 'undefined') {
    return { x: anchor.x, y: anchor.y };
  }

  const maxX = Math.max(MENU_OFFSET, window.innerWidth - size.width - MENU_OFFSET);
  const maxY = Math.max(MENU_OFFSET, window.innerHeight - size.height - MENU_OFFSET);

  return {
    x: clamp(anchor.x - size.width / 2, MENU_OFFSET, maxX),
    y: clamp(anchor.y - size.height - MENU_OFFSET, MENU_OFFSET, maxY),
  };
};

export function GlobalContextMenuProvider({ children }: { children: ReactNode }) {
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const menuOpenRef = useRef(false);
  const ignoreNextPointerUpRef = useRef(false);
  const anchorRef = useRef<Point | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    menuOpenRef.current = menuState !== null;
  }, [menuState]);

  const resetTransientState = useCallback(() => {
    setTranslation(null);
    setError(null);
    setIsTranslating(false);
    setIsSaving(false);
    setSaveMessage(null);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuState(null);
    anchorRef.current = null;
    resetTransientState();
  }, [resetTransientState]);

  const openMenu = useCallback(
    ({ text, anchor, variant }: { text: string; anchor: Point; variant: MenuVariant }) => {
      anchorRef.current = anchor;
      resetTransientState();

      const size = variant === 'mini' ? MINI_SIZE : FULL_SIZE;
      setMenuState({
        text,
        variant,
        position: computePosition(anchor, size),
      });
    },
    [resetTransientState]
  );

  const expandToFull = useCallback((anchorOverride?: Point) => {
    setMenuState(prev => {
      if (!prev) {
        return prev;
      }

      const anchor = anchorOverride ?? anchorRef.current ?? {
        x: prev.position.x + FULL_SIZE.width / 2,
        y: prev.position.y + FULL_SIZE.height + MENU_OFFSET,
      };

      anchorRef.current = anchor;

      return {
        ...prev,
        variant: 'full',
        position: computePosition(anchor, FULL_SIZE),
      };
    });
  }, []);

  const getSelectionText = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return null;
    }

    const text = selection.toString().trim();
    if (!text) {
      return null;
    }

    return text.length > MAX_SELECTION_CHARS ? text.slice(0, MAX_SELECTION_CHARS) : text;
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!menuState?.text || isTranslating) {
      return;
    }

    setIsTranslating(true);
    setTranslation(null);
    setError(null);

    try {
      const response = await fetch('/api/tools/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: menuState.text }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Failed to translate text.');
      }

      const data = await response.json();
      setTranslation(data.translation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  }, [menuState?.text, isTranslating]);

  const handleSave = useCallback(async () => {
    if (!menuState?.text || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/reading-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: menuState.text, translation }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Failed to save entry.');
      }

      const data = await response.json();
      if (data.translation) {
        setTranslation(data.translation);
      }
      setSaveMessage('Saved to reading list');
      emitReadingListUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry.');
    } finally {
      setIsSaving(false);
    }
  }, [menuState?.text, translation, isSaving]);

  const handleAskAI = useCallback(() => {
    if (!menuState?.text) {
      return;
    }
    emitChatPromptRequest(`"${menuState.text}"`);
    closeMenu();
  }, [menuState?.text, closeMenu]);

  const handleMiniTranslate = useCallback(() => {
    expandToFull();
    void handleTranslate();
  }, [expandToFull, handleTranslate]);

  const handleMiniSave = useCallback(() => {
    expandToFull();
    void handleSave();
  }, [expandToFull, handleSave]);

  const handleMiniAsk = useCallback(() => {
    expandToFull();
    handleAskAI();
  }, [expandToFull, handleAskAI]);

  const selectionPreview = useMemo(() => {
    if (!menuState?.text) {
      return '';
    }
    return menuState.text.length > 160 ? `${menuState.text.slice(0, 160)}…` : menuState.text;
  }, [menuState?.text]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      if ((event.target as Element | null)?.closest('[data-context-menu]')) {
        return;
      }

      if (ignoreNextPointerUpRef.current) {
        ignoreNextPointerUpRef.current = false;
        return;
      }

      const anchor = { x: event.clientX, y: event.clientY };
      anchorRef.current = anchor;

      requestAnimationFrame(() => {
        const text = getSelectionText();
        if (!text) {
          closeMenu();
          return;
        }
        openMenu({ text, anchor, variant: 'mini' });
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuOpenRef.current) {
        return;
      }

      if ((event.target as Element | null)?.closest('[data-context-menu]')) {
        return;
      }

      ignoreNextPointerUpRef.current = true;
      closeMenu();
    };

    const handleContextMenu = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('[data-context-menu]')) {
        return;
      }

      const text = getSelectionText();
      if (!text) {
        closeMenu();
        return;
      }

      event.preventDefault();
      const anchor = { x: event.clientX, y: event.clientY };

      if (menuOpenRef.current) {
        expandToFull(anchor);
      } else {
        openMenu({ text, anchor, variant: 'full' });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        ignoreNextPointerUpRef.current = true;
        closeMenu();
      }
    };

    document.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenu, expandToFull, getSelectionText, openMenu]);

  if (!mounted) {
    return <>{children}</>;
  }

  if (!menuState) {
    return <>{children}</>;
  }

  const MenuContent = menuState.variant === 'mini'
    ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMiniTranslate}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20"
            aria-label="Translate"
          >
            {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleMiniSave}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition hover:bg-secondary/80"
            aria-label="Save"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleMiniAsk}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/5 text-primary transition hover:bg-primary/15"
            aria-label="Ask AI"
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={closeMenu}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )
    : (
        <>
          <div className="flex items-start gap-3 p-4">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Selection</p>
              <p className="text-sm font-medium leading-snug whitespace-pre-wrap line-clamp-3">{selectionPreview}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={closeMenu}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-t border-border/40">
            <button
              type="button"
              onClick={handleTranslate}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition',
                'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60'
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Languages className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Translate to English</p>
                <p className="text-xs text-muted-foreground">Get a quick translation of the highlighted text.</p>
              </div>
              {isTranslating ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition border-t border-border/40',
                'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60'
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Bookmark className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Save to reading list</p>
                <p className="text-xs text-muted-foreground">Store this phrase with its translation.</p>
              </div>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-secondary-foreground" /> : null}
            </button>
            <button
              type="button"
              onClick={handleAskAI}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition border-t border-border/40',
                'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60'
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/5 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Ask AI</p>
                <p className="text-xs text-muted-foreground">Paste the selection into the chat composer.</p>
              </div>
            </button>
          </div>

          {(translation || error || saveMessage) && (
            <div className="border-t border-border/40 px-4 py-3 space-y-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Translation</p>
              {translation ? <p className="text-sm leading-snug whitespace-pre-wrap">{translation}</p> : null}
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              {saveMessage ? <p className="text-xs text-emerald-600">{saveMessage}</p> : null}
            </div>
          )}
        </>
      );

  return (
    <>
      {children}
      {createPortal(
        <div
          className="fixed z-[9999] will-change-transform"
          style={{ top: menuState.position.y, left: menuState.position.x }}
        >
          <div
            className={cn(
              'rounded-2xl border border-border/60 bg-popover/95 text-sm text-foreground shadow-2xl backdrop-blur-lg ring-1 ring-black/5 transition-all duration-150 ease-out',
              menuState.variant === 'mini' ? 'px-3 py-2' : 'w-[320px]'
            )}
            data-context-menu
          >
            {MenuContent}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
