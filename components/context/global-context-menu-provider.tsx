'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Languages, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MenuState {
  open: boolean;
  text: string;
  position: { x: number; y: number };
}

const INITIAL_STATE: MenuState = {
  open: false,
  text: '',
  position: { x: 0, y: 0 },
};

export function GlobalContextMenuProvider({ children }: { children: ReactNode }) {
  const [menuState, setMenuState] = useState<MenuState>(INITIAL_STATE);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const closeMenu = useCallback(() => {
    setMenuState(INITIAL_STATE);
    setTranslation(null);
    setError(null);
    setIsTranslating(false);
  }, []);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (!text) {
        closeMenu();
        return;
      }

      event.preventDefault();
      const maxTextLength = 800;
      const clippedText = text.length > maxTextLength ? text.slice(0, maxTextLength) : text;

      const offset = 12;
      const menuWidth = 320;
      const menuHeight = 260;
      const x = Math.min(event.clientX + offset, window.innerWidth - menuWidth - offset);
      const y = Math.min(event.clientY + offset, window.innerHeight - menuHeight - offset);

      setTranslation(null);
      setError(null);
      setIsTranslating(false);

      setMenuState({
        open: true,
        text: clippedText,
        position: { x: Math.max(offset, x), y: Math.max(offset, y) },
      });
    };

    const handleClick = () => closeMenu();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenu]);

  const handleTranslate = useCallback(async () => {
    if (!menuState.text || isTranslating) {
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
  }, [menuState.text, isTranslating]);

  const selectionPreview = useMemo(() => {
    if (!menuState.text) return '';
    return menuState.text.length > 160
      ? `${menuState.text.slice(0, 160)}…`
      : menuState.text;
  }, [menuState.text]);

  const menu = !menuState.open
    ? null
    : createPortal(
        <div
          className="fixed z-[9999]"
          style={{
            top: menuState.position.y,
            left: menuState.position.x,
          }}
        >
          <div
            className="w-[320px] rounded-2xl border border-border/60 bg-popover/95 text-sm text-foreground shadow-2xl backdrop-blur-lg ring-1 ring-black/5"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start gap-3 p-4">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Selection
                </p>
                <p className="text-sm font-medium leading-snug whitespace-pre-wrap line-clamp-3">
                  {selectionPreview}
                </p>
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
                  <p className="text-xs text-muted-foreground">
                    Get a quick translation of the highlighted text.
                  </p>
                </div>
                {isTranslating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : null}
              </button>
            </div>

            {(translation || error) && (
              <div className="border-t border-border/40 px-4 py-3 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Translation
                </p>
                {translation ? (
                  <p className="text-sm leading-snug whitespace-pre-wrap">
                    {translation}
                  </p>
                ) : null}
                {error ? (
                  <p className="text-xs text-destructive">{error}</p>
                ) : null}
              </div>
            )}
          </div>
        </div>,
        document.body
      );

  return (
    <>
      {children}
      {menu}
    </>
  );
}
