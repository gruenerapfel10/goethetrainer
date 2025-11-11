'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetcher } from '@/lib/utils';
import { READING_LIST_UPDATED_EVENT } from '@/lib/reading-list/events';

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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handle);
  }, [search]);

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

  const handleLoadMore = () => {
    if (nextCursor) {
      setSize(size + 1);
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      await fetch(`/api/reading-list/${entryId}`, { method: 'DELETE' });
      mutate();
    } catch (err) {
      console.error('Failed to delete entry', err);
    }
  };

  return (
    <div className="flex h-full flex-col">
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

      <ScrollArea className="flex-1 px-4 py-3">
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
              <div key={group.label} className="space-y-3">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-3">
                  {group.items.map(item => (
                    <article
                      key={item.id}
                      className="group rounded-2xl border border-border/50 bg-card/80 px-4 py-3 shadow-sm transition hover:border-border"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium leading-snug text-foreground">
                            {item.text}
                          </p>
                          <p className="text-sm text-muted-foreground leading-snug">
                            {item.translation}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(item.createdAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground opacity-0 transition group-hover:opacity-100"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

        {nextCursor && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={handleLoadMore}>
              Load more
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function groupEntries(entries: ReadingListItem[]) {
  const groups: Record<string, ReadingListItem[]> = {};
  const order: string[] = [];
  const now = new Date();

  entries.forEach(entry => {
    const entryDate = new Date(entry.createdAt);
    const label = getSectionLabel(entryDate, now);
    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(entry);
  });

  return order.map(label => ({
    label,
    items: groups[label],
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
  if (diffDays < 7) {
    return 'Last 7 Days';
  }
  if (diffDays < 30) {
    return 'Last 30 Days';
  }

  return entryDate.toLocaleDateString(undefined, {
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
