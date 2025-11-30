'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import type { PaperBlueprint } from '@/lib/papers/types';
import { LEVEL_PROFILES, type LevelId } from '@/lib/levels/level-profiles';

const PAPER_CATEGORIES: Array<{ value: SessionTypeEnum; label: string }> = [
  { value: SessionTypeEnum.READING, label: 'Reading' },
  { value: SessionTypeEnum.LISTENING, label: 'Listening' },
  { value: SessionTypeEnum.WRITING, label: 'Writing' },
  { value: SessionTypeEnum.SPEAKING, label: 'Speaking' },
];

type FilterType = SessionTypeEnum | 'all';

interface LibraryState {
  isLoading: boolean;
  error?: string;
  papers: Record<SessionTypeEnum, PaperBlueprint[]>;
}

const EMPTY_STATE: LibraryState = {
  isLoading: true,
  papers: {} as Record<SessionTypeEnum, PaperBlueprint[]>,
};

export default function LibraryPage() {
  const router = useRouter();
  const [{ papers, isLoading, error }, setState] = useState<LibraryState>(EMPTY_STATE);
  const [startingPaperId, setStartingPaperId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadPapers = async () => {
      if (cancelled) return;
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      try {
        const results: Record<SessionTypeEnum, PaperBlueprint[]> = {} as Record<
          SessionTypeEnum,
          PaperBlueprint[]
        >;

        await Promise.all(
          PAPER_CATEGORIES.map(async ({ value }) => {
            const response = await fetch(`/api/papers/by-type?type=${value}`, {
              cache: 'no-store',
            });
            if (!response.ok) {
              throw new Error('Failed to load papers');
            }
            const payload = (await response.json()) as { papers: PaperBlueprint[] };
            results[value] = payload.papers ?? [];
          })
        );

        if (!cancelled) {
          setState({ papers: results, isLoading: false });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            papers: {} as Record<SessionTypeEnum, PaperBlueprint[]>,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load papers',
          });
        }
      }
    };

    void loadPapers();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartPaper = async (paperId: string) => {
    if (startingPaperId) {
      return;
    }
    setStartingPaperId(paperId);
    setStartError(null);
    try {
      const response = await fetch(`/api/papers/${paperId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Failed to start paper');
      }
      const session = await response.json();
      router.push(`/${session.type}/session/${session.id}`);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Failed to start paper');
    } finally {
      setStartingPaperId(null);
    }
  };

  const allPapers = useMemo(() => {
    return Object.entries(papers)
      .flatMap(([type, items]) =>
        items.map(paper => ({ ...paper, type: type as SessionTypeEnum }))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [papers]);

  const filteredPapers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allPapers.filter(paper => {
      if (filterType !== 'all' && paper.type !== filterType) {
        return false;
      }
      if (term) {
        const content = [
          paper.metadata?.title,
          paper.metadata?.subtitle,
          paper.metadata?.preview,
        ]
          .filter(value => typeof value === 'string')
          .join(' ')
          .toLowerCase();
        if (!content.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [allPapers, filterType, searchTerm]);

  const renderPaperCard = (paper: PaperBlueprint) => {
    const createdAt = new Date(paper.createdAt);
    const subtitle =
      typeof paper.metadata?.subtitle === 'string'
        ? paper.metadata.subtitle
        : typeof paper.metadata?.preview === 'string'
          ? paper.metadata.preview
          : '';
    const levelIdRaw =
      (paper.metadata as any)?.levelId ??
      (paper.blueprint.questions?.[0] as any)?.levelId ??
      (paper.blueprint.questions?.[0] as any)?.appliedLevelProfile?.levelId;
    const normalizedLevelId =
      typeof levelIdRaw === 'string' ? (levelIdRaw as string).toUpperCase() : null;
    const hasValidLevel =
      normalizedLevelId !== null && (normalizedLevelId as LevelId) in LEVEL_PROFILES;
    const focusTags: string[] = (() => {
      if (Array.isArray((paper.metadata as any)?.focusCategories)) {
        return (paper.metadata as any)?.focusCategories as string[];
      }
      const fromQuestions = Array.from(
        new Set(
          (paper.blueprint.questions ?? []).flatMap(question => {
            const cat = (question as any)?.assessmentCategory;
            const gapCats = Array.isArray(question.gaps)
              ? question.gaps
                  .map(gap => (gap as any)?.assessmentCategory)
                  .filter((value): value is string => typeof value === 'string')
              : [];
            return [cat, ...gapCats].filter((value): value is string => typeof value === 'string');
          })
        )
      );
      return fromQuestions;
    })();

    return (
      <div
        key={paper.id}
        className="flex flex-col justify-between gap-4 rounded-2xl border border-muted bg-background p-5 shadow-sm transition hover:border-primary hover:shadow-lg"
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {paper.type}
          </p>
          <h3 className="text-lg font-semibold text-foreground">
            {paper.metadata?.title ?? ''}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {subtitle}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {hasValidLevel || normalizedLevelId ? (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {normalizedLevelId}
              </span>
            ) : null}
            {focusTags.slice(0, 6).map(tag => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 text-xs text-muted-foreground">
          <div className="text-xs">{formatDistanceToNow(createdAt, { addSuffix: true })}</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {paper.blueprint.questions.length} questions
            </span>
            <Button
              size="sm"
              disabled={startingPaperId === paper.id}
              onClick={() => handleStartPaper(paper.id)}
            >
              {startingPaperId === paper.id ? 'Starting…' : 'Start paper'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Library & Papers</h1>
        <p className="text-muted-foreground">
          Explore curated question papers. Use the filters and search to find the exact set you want to
          rerun.
        </p>
      </div>

      {startError && (
        <p className="rounded-full border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {startError}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex w-full items-center rounded-full border border-input bg-muted/20 px-3 py-2">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Search</span>
          <input
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Search titles, subtitles or previews"
            className="ml-3 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`rounded-full px-4 py-1 text-sm font-medium transition ${
              filterType === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'border border-input bg-transparent text-muted-foreground'
            }`}
          >
            All
          </button>
          {PAPER_CATEGORIES.map(category => (
            <button
              key={category.value}
              onClick={() => setFilterType(category.value)}
              className={`rounded-full px-4 py-1 text-sm font-medium transition ${
                filterType === category.value
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-input bg-transparent text-muted-foreground'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading available papers…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPapers.length > 0 ? (
          filteredPapers.map(renderPaperCard)
        ) : (
          <div className="rounded-2xl border border-dashed border-muted/60 p-6 text-sm text-muted-foreground">
            {isLoading
              ? 'Waiting for papers…'
              : 'No papers match that filter/search. Generate a new paper to add it to the library.'}
          </div>
        )}
      </div>
    </div>
  );
}
