'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { MoreHorizontal, PencilLine, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetcher, cn } from '@/lib/utils';
import {
  READING_LIST_UPDATED_EVENT,
  emitReadingListUpdated,
} from '@/lib/reading-list/events';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Bookmark, Sparkles, Volume2 } from 'lucide-react';
import { speakText, isTextToSpeechAvailable } from '@/lib/tts';
import { emitChatPromptRequest } from '@/lib/chat/events';
import { useToast } from '@/hooks/use-toast';
import { differenceInHours, differenceInMinutes, parseISO } from 'date-fns';

interface ReadingListItem {
  id: string;
  text: string;
  translation: string;
  createdAt: string; // ISO string from API
}

interface ReadingListResponse {
  items: ReadingListItem[];
  nextCursor: string | null;
}

const PAGE_SIZE = 20;

export function ReadingListPanel() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ text: '', translation: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setTtsSupported(isTextToSpeechAvailable());
  }, []);

  const getKey = useCallback(
    (pageIndex: number, previousPageData: ReadingListResponse | null) => {
      if (previousPageData && !previousPageData.nextCursor) {
        return null;
      }
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
      });
      if (pageIndex > 0 && previousPageData?.nextCursor) {
        params.set('cursor', previousPageData.nextCursor);
      }
      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      }
      return `/api/reading-list?${params.toString()}`;
    },
    [debouncedSearch]
  );

  const {
    data,
    error,
    size,
    setSize,
    mutate,
    isValidating,
  } = useSWRInfinite<ReadingListResponse>(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: true,
  });

  // Listen for global updates (e.g., context menu "save to reading list")
  useEffect(() => {
    const handler = () => mutate();
    window.addEventListener(READING_LIST_UPDATED_EVENT, handler);
    return () => window.removeEventListener(READING_LIST_UPDATED_EVENT, handler);
  }, [mutate]);

  const entries = useMemo(
    () => data?.flatMap(page => page.items) ?? [],
    [data]
  );

  const nextCursor = data?.[data.length - 1]?.nextCursor ?? null;

  const groups = useMemo(() => groupEntries(entries), [entries]);

  const handleNextPage = () => {
    if (nextCursor && !isValidating) {
      setSize(size + 1);
    }
  };

  const handlePrevPage = () => {
    if (size > 1 && !isValidating) {
      setSize(size - 1);
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      await fetch(`/api/reading-list/${entryId}`, { method: 'DELETE' });
      mutate();
      emitReadingListUpdated();
    } catch (err) {
      console.error('Failed to delete entry', err);
    }
  };

  const startEdit = (item: ReadingListItem) => {
    setEditingId(item.id);
    setEditForm({ text: item.text, translation: item.translation });
    setErrorMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ text: '', translation: '' });
    setErrorMessage(null);
  };

  const handleEditChange = (field: 'text' | 'translation', value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editForm.text.trim() || !editForm.translation.trim()) {
      setErrorMessage('Bitte Text und Übersetzung ausfüllen.');
      return;
    }
    setIsSavingEdit(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/reading-list/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editForm.text.trim(),
          translation: editForm.translation.trim(),
        }),
      });
      if (!response.ok) {
        throw new Error('Update failed');
      }
      await mutate();
      cancelEdit();
      emitReadingListUpdated();
    } catch (err) {
      console.error('Failed to update reading list entry', err);
      setErrorMessage('Speichern fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleTranslate = async (text: string) => {
    try {
      await fetch('/api/tools/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    } catch (err) {
      console.error('Failed to translate entry', err);
    }
  };

  const handleAskAIEntry = (text: string) => {
    emitChatPromptRequest(text);
  };

  const handleSpeakEntry = async (text: string) => {
    if (!ttsSupported) {
      toast({
        title: 'Text-to-Speech nicht verfügbar',
        description: 'Bitte stellen Sie sicher, dass Ihr Browser Sprachausgabe unterstützt.',
      });
      return;
    }
    try {
      await speakText(text, { lang: 'de-DE' });
    } catch (err) {
      console.error('Failed to speak entry', err);
      toast({
        title: 'Wiedergabe fehlgeschlagen',
        description: 'Die Sprachausgabe konnte nicht gestartet werden.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search saved words or translations"
            className="pl-9 pr-3"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {error ? (
          <p className="text-sm text-destructive">
            Failed to load reading list.
          </p>
        ) : groups.length === 0 && !isValidating ? (
          <p className="text-sm text-muted-foreground">
            No saved entries yet. Highlight text and choose “Save to reading list”.
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.label} className="space-y-2">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground px-1">
                  {group.label}
                </p>
                <div className="space-y-0">
                  {group.items.map(item => (
                    <article
                      key={item.id}
                      className="group px-4 py-3 border-b border-border/60 bg-transparent rounded-none transition hover:bg-muted/20"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          {editingId === item.id ? (
                            <>
                              <div className="flex flex-col gap-2">
                                <Input
                                  value={editForm.text}
                                  onChange={event => handleEditChange('text', event.target.value)}
                                  placeholder="Wort / Ausdruck"
                                  className="text-sm"
                                />
                                <Input
                                  value={editForm.translation}
                                  onChange={event =>
                                    handleEditChange('translation', event.target.value)
                                  }
                                  placeholder="Übersetzung / Notiz"
                                  className="text-sm"
                                />
                              </div>
                              <div className="mt-2 flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={saveEdit}
                                  disabled={isSavingEdit}
                                >
                                  Speichern
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                  disabled={isSavingEdit}
                                >
                                  Abbrechen
                                </Button>
                              </div>
                              {errorMessage && (
                                <p className="mt-1 text-xs text-destructive">{errorMessage}</p>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex items-baseline gap-4 overflow-hidden">
                                <p className="text-lg font-semibold leading-snug text-foreground truncate">
                                  {item.text}
                                </p>
                                <p className="text-lg font-semibold text-muted-foreground leading-snug truncate">
                                  {item.translation}
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatTimestamp(item.createdAt)}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {editingId !== item.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => startEdit(item)}
                            >
                              <PencilLine className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            disabled={!ttsSupported}
                            onClick={() => handleSpeakEntry(item.text)}
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground opacity-0 transition group-hover:opacity-100 data-[state=open]:opacity-100"
                              >
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onClick={() => handleTranslate(item.text)}
                                className="gap-3"
                              >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <Languages className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold">Translate</p>
                                  <p className="text-xs text-muted-foreground">Send to translator</p>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAskAIEntry(item.text)}
                                className="gap-3"
                              >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/5 text-primary">
                                  <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold">Ask AI</p>
                                  <p className="text-xs text-muted-foreground">Paste into chat</p>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(item.id)}
                                className="gap-3"
                              >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold">Delete</p>
                                  <p className="text-xs text-muted-foreground">Remove from list</p>
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {isValidating && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Updating…
          </p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={size <= 1 || isValidating}
          >
            Previous
          </Button>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Page {size}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!nextCursor || isValidating}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function groupEntries(entries: ReadingListItem[]) {
  const now = new Date();
  const buckets: Record<string, ReadingListItem[]> = {
    'Just now': [],
    'Today': [],
    'Last 3 days': [],
    'Last 7 days': [],
    'Older': [],
  };

  entries.forEach(entry => {
    const entryDate = parseISO(entry.createdAt);
    const mins = differenceInMinutes(now, entryDate);
    const hours = differenceInHours(now, entryDate);
    if (mins <= 10) {
      buckets['Just now'].push(entry);
    } else if (hours < 24) {
      buckets['Today'].push(entry);
    } else if (hours < 72) {
      buckets['Last 3 days'].push(entry);
    } else if (hours < 24 * 7) {
      buckets['Last 7 days'].push(entry);
    } else {
      buckets['Older'].push(entry);
    }
  });

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({
      label,
      items,
    }));
}


function getSectionLabel(entryDate: Date, now: Date): string {
  const diffMs = now.getTime() - entryDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays <= 3) {
    return 'Past 3 Days';
  }
  if (diffDays <= 7) {
    return 'Last Week';
  }

  return entryDate.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
