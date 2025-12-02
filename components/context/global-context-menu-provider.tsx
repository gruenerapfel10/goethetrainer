'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Languages, Loader2, Sparkles, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, fetcher } from '@/lib/utils';
import { emitReadingListUpdated, READING_LIST_UPDATED_EVENT } from '@/lib/reading-list/events';
import { emitChatPromptRequest } from '@/lib/chat/events';
import { isTextToSpeechAvailable, speakText, stopSpeaking } from '@/lib/tts';
import useSWR from 'swr';

const MENU_OFFSET = 12;
const MINI_SIZE = { width: 220, height: 56 };
const FULL_SIZE = { width: 320, height: 260 };
const MAX_SELECTION_CHARS = 800;

type Point = { x: number; y: number };
type MenuVariant = 'mini' | 'full';

interface MenuState {
  text: string;
  context?: string;
  variant: MenuVariant;
  position: Point;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const normalizeText = (value: string) => value.trim().toLowerCase();
const normalizeKey = (value: string) =>
  normalizeText(value).replace(/[^\p{L}\p{N}\s-]+/gu, '').replace(/\s+/g, ' ');

const computePosition = (anchor: Point, size: { width: number; height: number }) => {
  if (typeof window === 'undefined') {
    return { x: anchor.x, y: anchor.y };
  }

  const maxX = Math.max(MENU_OFFSET, window.innerWidth - size.width - MENU_OFFSET);
  const maxY = Math.max(MENU_OFFSET, window.innerHeight - size.height - MENU_OFFSET);

  const aboveY = anchor.y - size.height - MENU_OFFSET;
  const belowY = anchor.y + MENU_OFFSET;
  const fitsAbove = aboveY >= MENU_OFFSET;
  const fitsBelow = belowY + size.height + MENU_OFFSET <= window.innerHeight;

  return {
    x: clamp(anchor.x - size.width / 2, MENU_OFFSET, maxX),
    y: fitsAbove || !fitsBelow
      ? clamp(aboveY, MENU_OFFSET, maxY)
      : clamp(belowY, MENU_OFFSET, maxY),
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { data: readingListData, mutate: mutateReadingList } = useSWR<{ items: Array<{ text: string; translation: string }> }>(
    '/api/reading-list?limit=500',
    fetcher,
    { revalidateOnFocus: false }
  );
  const savedTranslations = useMemo(() => {
    const map = new Map<string, string>();
    readingListData?.items?.forEach(item => {
      const key = normalizeKey(item.text);
      if (key) {
        map.set(key, item.translation);
      }
    });
    return map;
  }, [readingListData]);

  const menuOpenRef = useRef(false);
  const ignoreNextPointerUpRef = useRef(false);
  const anchorRef = useRef<Point | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    menuOpenRef.current = menuState !== null;
  }, [menuState]);
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handler = () => {
      mutateReadingList();
    };
    window.addEventListener(READING_LIST_UPDATED_EVENT, handler);
    return () => window.removeEventListener(READING_LIST_UPDATED_EVENT, handler);
  }, [mutateReadingList]);

  const resetTransientState = useCallback(() => {
    setTranslation(null);
    setError(null);
    setIsTranslating(false);
    setIsSaving(false);
    setSaveMessage(null);
    setIsSpeaking(false);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuState(null);
    anchorRef.current = null;
    stopSpeaking();
    resetTransientState();
  }, [resetTransientState]);

  const openMenu = useCallback(
    ({
      text,
      context,
      anchor,
      variant,
    }: {
      text: string;
      context?: string;
      anchor: Point;
      variant: MenuVariant;
    }) => {
      anchorRef.current = anchor;
      resetTransientState();

      const size = variant === 'mini' ? MINI_SIZE : FULL_SIZE;
      setMenuState({
        text,
        context,
        variant,
        position: computePosition(anchor, size),
      });
    },
    [resetTransientState]
  );

  const getMenuSize = useCallback(
    (variant: MenuVariant): { width: number; height: number } => {
      const fallback = variant === 'mini' ? MINI_SIZE : FULL_SIZE;
      if (!menuRef.current) return fallback;
      const rect = menuRef.current.getBoundingClientRect();
      return {
        width: rect.width || fallback.width,
        height: rect.height || fallback.height,
      };
    },
    []
  );

  const repositionMenu = useCallback(
    (variantOverride?: MenuVariant) => {
      setMenuState(prev => {
        if (!prev) return prev;
        const variant = variantOverride ?? prev.variant;
        const size = getMenuSize(variant);
        const anchor =
          anchorRef.current ??
          {
            x: prev.position.x + size.width / 2,
            y: prev.position.y + size.height + MENU_OFFSET,
          };
        const nextPos = computePosition(anchor, size);
        if (
          prev.position.x === nextPos.x &&
          prev.position.y === nextPos.y &&
          prev.variant === variant
        ) {
          return prev;
        }
        return { ...prev, variant, position: nextPos };
      });
    },
    [getMenuSize]
  );

  const expandToFull = useCallback(
    (anchorOverride?: Point) => {
      if (anchorOverride) {
        anchorRef.current = anchorOverride;
      }
      repositionMenu('full');
    },
    [repositionMenu]
  );

  const getSelectionWithContext = useCallback((): { text: string; context?: string } | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return null;
    }

    const rawText = selection.toString();
    const text = rawText.trim();
    if (!text) {
      return null;
    }

    const boundedText =
      text.length > MAX_SELECTION_CHARS ? text.slice(0, MAX_SELECTION_CHARS) : text;

    let context: string | undefined;

    try {
      const range = selection.getRangeAt(0);
      let container: Node | null = range.commonAncestorContainer;

      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
      }

      while (container && container.parentNode && container.parentNode !== document.body) {
        container = container.parentNode;
      }

      const fullText = (container?.textContent ?? '').trim();

      if (fullText) {
        const idx = fullText.indexOf(text);
        if (idx !== -1) {
          let start = idx;
          for (let i = idx - 1; i >= 0; i -= 1) {
            const char = fullText[i];
            if (char === '.' || char === '!' || char === '?' || char === '\n') {
              start = i + 1;
              break;
            }
            if (i === 0) {
              start = 0;
            }
          }

          let end = idx + text.length;
          for (let i = end; i < fullText.length; i += 1) {
            const char = fullText[i];
            if (char === '.' || char === '!' || char === '?' || char === '\n') {
              end = i + 1;
              break;
            }
            if (i === fullText.length - 1) {
              end = fullText.length;
            }
          }

          const sentence = fullText.slice(start, end).trim();
          if (sentence && sentence.length > boundedText.length) {
            context =
              sentence.length > MAX_SELECTION_CHARS
                ? sentence.slice(0, MAX_SELECTION_CHARS)
                : sentence;
          }
        }
      }
    } catch {
      // If anything goes wrong while computing context, fall back to selection-only.
      context = undefined;
    }

    return { text: boundedText, context };
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
        body: JSON.stringify({
          text: menuState.text,
          context: menuState.context ?? menuState.text,
        }),
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
      void mutateReadingList();
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

  const handleSpeak = useCallback(async () => {
    if (!menuState?.text || isSpeaking || !isTextToSpeechAvailable()) {
      return;
    }
    setIsSpeaking(true);
    setError(null);
    try {
      await speakText(menuState.text, { lang: 'de-DE' });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Text-to-speech is not available in this browser.'
      );
    } finally {
      setIsSpeaking(false);
    }
  }, [menuState?.text, isSpeaking]);

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

  const handleMiniSpeak = useCallback(() => {
    expandToFull();
    void handleSpeak();
  }, [expandToFull, handleSpeak]);

  const selectionPreview = useMemo(() => {
    if (!menuState?.text) {
      return '';
    }
    return menuState.text.length > 160 ? `${menuState.text.slice(0, 160)}…` : menuState.text;
  }, [menuState?.text]);

  const ttsSupported = typeof window !== 'undefined' && isTextToSpeechAvailable();

  useEffect(() => {
    if (!menuState?.text) {
      return;
    }
    const key = normalizeText(menuState.text);
    if (!key) {
      return;
    }
    const savedTranslation = savedTranslations.get(normalizeKey(menuState.text));
    if (savedTranslation) {
      setTranslation(savedTranslation);
      setSaveMessage('Already in reading list');
    }
  }, [menuState?.text, savedTranslations]);

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
        const selection = getSelectionWithContext();
        if (!selection) {
          closeMenu();
          return;
        }
        openMenu({
          text: selection.text,
          context: selection.context,
          anchor,
          variant: 'mini',
        });
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

      const selection = getSelectionWithContext();
      if (!selection) {
        closeMenu();
        return;
      }

      event.preventDefault();
      const anchor = { x: event.clientX, y: event.clientY };

      if (menuOpenRef.current) {
        expandToFull(anchor);
      } else {
        openMenu({
          text: selection.text,
          context: selection.context,
          anchor,
          variant: 'full',
        });
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
  }, [closeMenu, expandToFull, getSelectionWithContext, openMenu]);

  // Reposition after render when dimensions/content change or on resize.
  useLayoutEffect(() => {
    if (menuState) {
      repositionMenu(menuState.variant);
    }
  }, [menuState?.variant, translation, saveMessage, error, repositionMenu]);

  useEffect(() => {
    if (!menuState) return;
    const handleResize = () => repositionMenu(menuState.variant);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [menuState, repositionMenu]);

  if (!mounted) {
    return <>{children}</>;
  }

  if (!menuState) {
    return <>{children}</>;
  }

  const miniButtonRow = (
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
        onClick={handleMiniSpeak}
        disabled={!ttsSupported || isSpeaking}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full transition',
          ttsSupported
            ? 'bg-primary/10 text-primary hover:bg-primary/20'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
        aria-label="Listen"
      >
        {isSpeaking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
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
  );

  const MenuContent = menuState.variant === 'mini'
    ? (
        <div className="space-y-2">
          {(translation || saveMessage) && (
            <div className="space-y-1">
              {translation && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1 whitespace-pre-wrap">
                  {translation}
                </p>
              )}
              {saveMessage && (
                <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-600">{saveMessage}</p>
              )}
            </div>
          )}
          {miniButtonRow}
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
            <button
              type="button"
              onClick={handleSpeak}
              disabled={!ttsSupported || isSpeaking}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition border-t border-border/40',
                ttsSupported
                  ? 'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60'
                  : 'opacity-60 cursor-not-allowed'
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full',
                  ttsSupported ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {isSpeaking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Listen</p>
                <p className="text-xs text-muted-foreground">Play this selection via text-to-speech.</p>
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
            ref={menuRef}
          >
            {MenuContent}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
