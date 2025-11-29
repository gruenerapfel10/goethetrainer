'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FlashcardBuilderModal } from '@/components/flashcards/flashcard-builder-modal';
import type { Deck, FlashcardSession } from '@/lib/flashcards/types';
import { FeedbackRating } from '@/lib/flashcards/types';
import { getFeedbackPolicy } from '@/lib/flashcards/feedback/policies';
import type { FlashcardAnalyticsBundle, DeckAnalytics } from '@/lib/flashcards/analytics/types';
import { Search, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SessionConfig } from '@/components/flashcards/SessionConfig';
import { SessionAnalysis } from '@/components/flashcards/SessionAnalysis';
import { DeckContent } from '@/components/flashcards/DeckContent';

export default function FlashcardsPage() {
  const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
  const [publishedDecks, setPublishedDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [session, setSession] = useState<FlashcardSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [studyMode, setStudyMode] = useState<'flashcard' | 'typing'>('flashcard');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typingResult, setTypingResult] = useState<string | null>(null);
  const [activePolicyId, setActivePolicyId] = useState('ternary');

  const [analyticsBundle, setAnalyticsBundle] = useState<FlashcardAnalyticsBundle | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [selectedAnalyticsDeckId, setSelectedAnalyticsDeckId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'cards'>('newest');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryInput, setCategoryInput] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const activePolicy = useMemo(() => {
    try {
      return getFeedbackPolicy(activePolicyId);
    } catch {
      return getFeedbackPolicy('ternary');
    }
  }, [activePolicyId]);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const response = await fetch('/api/flashcards/categories');
      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload.categories)) {
          setCategories(payload.categories);
        }
      }
    } catch (error) {
      console.error('Failed to load categories', error);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const handleCreateCategory = useCallback(async () => {
    const trimmed = categoryInput.trim();
    if (!trimmed) return;
    setCreatingCategory(true);
    try {
      const response = await fetch('/api/flashcards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const payload = await response.json();
      if (response.ok && payload.category) {
        setCategories(prev => (prev.find(item => item.id === payload.category.id) ? prev : [payload.category, ...prev]));
        setCategoryInput('');
        setCategoryModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to create category', error);
    } finally {
      setCreatingCategory(false);
    }
  }, [categoryInput]);

  const refreshDecks = useCallback(async () => {
    setLoadingDecks(true);
    const response = await fetch('/api/flashcards/decks?status=published');
    const data = await response.json();
    setPublishedDecks(data.decks ?? []);
    setLoadingDecks(false);
  }, []);

  const refreshAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    const response = await fetch('/api/flashcards/analytics');
    const data = await response.json();
    if (!response.ok) {
      setAnalyticsError(data.error ?? 'Failed to load analytics');
    } else {
      setAnalyticsBundle(data as FlashcardAnalyticsBundle);
      setAnalyticsError(null);
    }
    setLoadingAnalytics(false);
  }, []);

  useEffect(() => {
    void fetchCategories();
    void refreshDecks();
    void refreshAnalytics();
  }, [fetchCategories, refreshDecks, refreshAnalytics]);

  useEffect(() => {
    if (!selectedAnalyticsDeckId && analyticsBundle?.decks?.length) {
      setSelectedAnalyticsDeckId(analyticsBundle.decks[0].deckId);
    }
  }, [analyticsBundle, selectedAnalyticsDeckId]);

  useEffect(() => {
    setTypingResult(null);
    setTypedAnswer('');
  }, [session?.activeCard?.card.id, studyMode]);

  useEffect(() => {
    setShowAnswer(false);
  }, [session?.activeCard?.card.id]);

  const [runnerMode, setRunnerMode] = useState<'finite' | 'infinite'>('finite');
  const [algorithm, setAlgorithm] = useState<'sequential' | 'faust'>('faust');

  const startDeck = async (deckId: string, mode: 'flashcard' | 'typing') => {
    const response = await fetch('/api/flashcards/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deckId, mode: runnerMode, algorithm }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? 'Failed to start session');
      return;
    }
    setError(null);
    const targetMode = mode === 'typing' ? 'typing' : 'flashcard';
    window.location.href = `/flashcards/session/${payload.session.id}?mode=${targetMode}`;
  };

  const answerCard = async (feedback: number) => {
    if (!session) return;
    setIsAnswering(true);
    const response = await fetch(`/api/flashcards/sessions/${session.id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? 'Failed to record answer');
    } else {
      setSession(payload.session);
      setError(null);
      await refreshAnalytics();
    }
    setIsAnswering(false);
  };

  const handleTypingSubmit = async () => {
    if (!session || !session.activeCard || isAnswering) return;
    const expected = session.activeCard.card.back.trim().toLowerCase();
    const guess = typedAnswer.trim().toLowerCase();
    const correct = guess.length > 0 && guess === expected;
    setTypingResult(correct ? 'Correct!' : `Expected: ${session.activeCard.card.back}`);
    setTypedAnswer('');
    await answerCard(correct ? FeedbackRating.GOOD : FeedbackRating.AGAIN);
  };

  const exportDeck = async (deckId: string, format: 'csv' | 'anki' = 'csv') => {
    const response = await fetch('/api/flashcards/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deckId, format }),
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${deckId}.${format === 'anki' ? 'txt' : 'csv'}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAnalytics = async (format: 'json' | 'csv') => {
    if (!selectedAnalyticsDeckId) {
      setError('Select a deck to export analytics');
      return;
    }
    const response = await fetch(
      `/api/flashcards/analytics/export?deckId=${selectedAnalyticsDeckId}&format=${format}`
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? 'Failed to export analytics');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedAnalyticsDeckId}-analytics.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const analyticsSummary = analyticsBundle?.summary;
  const formatNumber = (value: number | undefined) => (value ?? 0).toLocaleString();
  const totalDecks = analyticsSummary?.totalDecks ?? publishedDecks.length;
  const totalCards = analyticsSummary?.totalCards ?? publishedDecks.reduce((sum, deck) => sum + deck.cards.length, 0);
  const activeCardCount = session ? session.remainingQueue.length + (session.activeCard ? 1 : 0) : 0;
  const latestDeckId = publishedDecks[0]?.id ?? null;

  const selectedDeckAnalytics: DeckAnalytics | null = useMemo(() => {
    if (!selectedAnalyticsDeckId || !analyticsBundle?.decks) {
      return null;
    }
    return analyticsBundle.decks.find(deck => deck.deckId === selectedAnalyticsDeckId) ?? null;
  }, [analyticsBundle, selectedAnalyticsDeckId]);

  const builderRefresh = useCallback(async () => {
    await refreshDecks();
    await refreshAnalytics();
  }, [refreshDecks, refreshAnalytics]);

  const categoryOptions = useMemo(() => {
    const names = categories.map(cat => cat.name);
    return ['All', ...names];
  }, [categories]);

  const filteredDecks = useMemo(() => {
    const normalized = publishedDecks.filter(deck => {
      const matchesSearch = deck.title.toLowerCase().includes(searchTerm.toLowerCase());
      if (searchTerm && !matchesSearch) return false;
      if (activeCategory === 'All') return true;
      return deck.categories.some(cat => cat.toLowerCase() === activeCategory.toLowerCase());
    });
    if (sortMode === 'newest') {
      return normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortMode === 'oldest') {
      return normalized.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return normalized.sort((a, b) => b.cards.length - a.cards.length);
  }, [publishedDecks, searchTerm, activeCategory, sortMode]);

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
        <div className="space-y-6 p-3 pb-10 pt-16">
          {error && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          )}

        <section className="relative overflow-hidden rounded-[32px] bg-card/90 px-6 py-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)] mx-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Flashcard Lab</p>
            <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Flashcards
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground">
              Advanced flashcards with AI generation and advanced analytics
            </p>
            <div className="flex flex-wrap gap-0">
              <Button className="rounded-full px-6" onClick={() => setBuilderOpen(true)}>
                Forge a deck
              </Button>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-2 px-2">
          {/* Search and Sort Row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1">
              <input
                className="w-full rounded-full bg-background px-4 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                placeholder="Search decks"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 transform text-muted-foreground" size={18} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 px-3 gap-2 text-sm font-normal rounded-full bg-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="capitalize">{sortMode === 'cards' ? 'Card count' : sortMode}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="bottom" className="rounded-xl">
                <DropdownMenuItem
                  onSelect={() => setSortMode('newest')}
                  className={sortMode === 'newest' ? 'bg-accent' : ''}
                >
                  Newest
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setSortMode('oldest')}
                  className={sortMode === 'oldest' ? 'bg-accent' : ''}
                >
                  Oldest
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setSortMode('cards')}
                  className={sortMode === 'cards' ? 'bg-accent' : ''}
                >
                  Card count
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Categories Row */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              key="all"
              type="button"
              onClick={() => setActiveCategory('All')}
              className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                activeCategory === 'All'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
              }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.name)}
                className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                  activeCategory === category.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                }`}
              >
                {category.name}
              </button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCategoryInput('');
                setCategoryModalOpen(true);
              }}
              className="rounded-full h-7 w-7 p-0 bg-muted hover:bg-muted/80 border border-border text-lg font-bold"
            >
              +
            </Button>
          </div>

          <SessionConfig
            className="mt-3"
            runnerMode={runnerMode}
            onRunnerModeChange={setRunnerMode}
            algorithm={algorithm}
            onAlgorithmChange={setAlgorithm}
            showRunnerToggle
          />
        </section>

        <section className="px-2">
          <SessionAnalysis analytics={analyticsBundle} selectedDeckId={selectedAnalyticsDeckId ?? publishedDecks[0]?.id ?? null} />
        </section>

        <div className="pb-4 px-2">
          <h2 className="text-2xl font-bold text-foreground mb-4 px-2">Decks</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDecks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No decks match your search.</p>
            ) : (
              filteredDecks.map(deck => (
                <div key={deck.id} className="rounded-3xl bg-background dark:bg-black p-8 shadow-[0_25px_80px_rgba(15,23,42,0.12)] min-h-[280px] flex flex-col justify-between transition-all hover:shadow-[0_25px_100px_rgba(15,23,42,0.2)]">
                  <div>
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-2xl font-bold text-foreground">{deck.title}</h3>
                      <span className="text-2xl font-bold text-foreground whitespace-nowrap ml-2">
                        {deck.cards.length}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {deck.description ?? 'No description'}
                    </p>
                    {deck.categories && deck.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {deck.categories.map(category => (
                          <span key={category} className="rounded-full bg-primary/20 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            {category}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4">
                      <DeckContent deck={analyticsBundle?.decks?.find(d => d.deckId === deck.id) ?? null} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs uppercase text-muted-foreground">
                      {new Date(deck.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="rounded-full px-4"
                        onClick={() => void startDeck(deck.id, 'flashcard')}
                      >
                        Review
                      </Button>
                      <Button
                        className="rounded-full px-6"
                        onClick={() => void startDeck(deck.id, 'typing')}
                      >
                        Start
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Study session panel */}
        {session && (
          <div className="mx-2 mb-8 rounded-3xl bg-card/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                  Active session
                </p>
                <p className="text-xl font-semibold text-foreground">
                  Deck: {publishedDecks.find(d => d.id === session.deckId)?.title ?? session.deckId}
                </p>
              </div>
              <div className="flex gap-2 text-sm text-muted-foreground">
                <span>Queue: {activeCardCount}</span>
                <span className="px-2">•</span>
                <span>Completed: {session.completed.length}</span>
              </div>
            </div>

            {session.activeCard ? (
              <div className="mt-4 rounded-2xl border border-border/50 bg-background/60 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={studyMode === 'flashcard' ? 'default' : 'outline'}
                      className="rounded-full"
                      onClick={() => setStudyMode('flashcard')}
                    >
                      Flip mode
                    </Button>
                    <Button
                      size="sm"
                      variant={studyMode === 'typing' ? 'default' : 'outline'}
                      className="rounded-full"
                      onClick={() => {
                        setStudyMode('typing');
                        setShowAnswer(false);
                      }}
                    >
                      Typing mode
                    </Button>
                  </div>
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {session.activeCard.card.tags?.join(', ') || 'untagged'}
                  </span>
                </div>

                {studyMode === 'flashcard' ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-lg font-semibold text-foreground">
                      {session.activeCard.card.front}
                    </p>
                    {!showAnswer && session.activeCard.card.hint && (
                      <p className="text-sm text-muted-foreground italic">Hint: {session.activeCard.card.hint}</p>
                    )}
                    {showAnswer && (
                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="text-base text-foreground">{session.activeCard.card.back}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {!showAnswer && (
                        <Button variant="secondary" className="rounded-full" onClick={() => setShowAnswer(true)}>
                          Reveal answer
                        </Button>
                      )}
                      {activePolicy.options.map(option => (
                        <Button
                          key={option.label}
                          className="rounded-full"
                          variant={option.tone === 'danger' ? 'destructive' : option.tone === 'warning' ? 'secondary' : 'default'}
                          disabled={isAnswering}
                          onClick={() => {
                            setShowAnswer(false);
                            void answerCard(option.rating);
                          }}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <p className="text-lg font-semibold text-foreground">
                      {session.activeCard.card.front}
                    </p>
                    <input
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      placeholder="Type your answer"
                      value={typedAnswer}
                      onChange={e => setTypedAnswer(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          void handleTypingSubmit();
                        }
                      }}
                    />
                    {typingResult && (
                      <p className="text-sm text-muted-foreground">{typingResult}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        className="rounded-full"
                        disabled={isAnswering}
                        onClick={() => void handleTypingSubmit()}
                      >
                        Submit
                      </Button>
                      <Button
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => {
                          setTypedAnswer('');
                          setTypingResult(null);
                          setShowAnswer(true);
                        }}
                      >
                        Reveal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border/50 bg-background/40 p-6 text-sm text-muted-foreground">
                Session complete. Start another deck to keep going.
              </div>
            )}
          </div>
        )}
      </div>
      <FlashcardBuilderModal open={builderOpen} onOpenChange={setBuilderOpen} onRefresh={builderRefresh} />

      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="border-none bg-background p-0 text-foreground shadow-[0_25px_80px_rgba(15,23,42,0.12)] sm:rounded-[32px] sm:max-w-[425px]">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            {/* Header */}
            <header className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold text-foreground">Create Category</h2>
              <p className="text-sm text-muted-foreground">Add a new category to organize your flashcard decks</p>
            </header>

            {/* Content */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="category-name" className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                  Category name
                </label>
                <Input
                  id="category-name"
                  placeholder="e.g., German Grammar, History"
                  value={categoryInput}
                  onChange={e => setCategoryInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleCreateCategory();
                    }
                  }}
                  autoFocus
                  className="h-12 rounded-2xl border-none bg-muted text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryModalOpen(false)}
                className="rounded-full px-6"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateCategory}
                disabled={!categoryInput.trim() || creatingCategory}
                className="rounded-full px-6"
              >
                {creatingCategory ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
