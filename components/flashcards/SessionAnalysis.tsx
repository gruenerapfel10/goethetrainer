'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMediaQuery } from 'usehooks-ts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { HorizontalCarousel } from '@/components/flashcards/HorizontalCarousel';
import { DeckContent } from '@/components/flashcards/DeckContent';
import { ReminderAlgorithm } from '@/lib/flashcards/scheduler/reminderAlgorithm';
import type { FlashcardAnalyticsBundle } from '@/lib/flashcards/analytics/types';
import { cn } from '@/lib/utils';

type SessionAnalysisProps = {
  analytics?: FlashcardAnalyticsBundle | null;
  selectedDeckId?: string | null;
};

const formatInactivity = (days: number) => {
  if (days >= 90) return 'Never reviewed';
  if (days === 0) return 'Reviewed today';
  if (days === 1) return '1 day idle';
  return `${days} days idle`;
};

const toPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(0)}%`;
};

export function SessionAnalysis({ analytics, selectedDeckId }: SessionAnalysisProps) {
  if (!analytics) return null;

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isLargeDesktop = useMediaQuery('(min-width: 1440px)');
  const bleed = isDesktop ? (isLargeDesktop ? 240 : 180) : 40;
  const gap = isDesktop ? 12 : 8;
  const [carouselIndex, setCarouselIndex] = useState(0);
  const prioritized = ReminderAlgorithm.buildPriorityList(analytics);
  const items = prioritized.slice(0, 6);
  const selectedIndex = selectedDeckId ? items.findIndex(deck => deck.deckId === selectedDeckId) : 0;
  const initialIndex = selectedIndex < 0 ? 0 : selectedIndex;
  const currentDeck = items[carouselIndex];
  const deckAnalytics = currentDeck ? analytics.decks?.find(d => d.deckId === currentDeck.deckId) : null;
  const controlsRef = useRef<{ onPrev: () => void; onNext: () => void } | null>(null);

  useEffect(() => {
    if (!items.length) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (el?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        controlsRef.current?.onPrev?.();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        controlsRef.current?.onNext?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-4">Session scheduler</h2>
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="space-y-4 pt-0 px-0">
          {!items.length ? (
            <p className="text-sm text-muted-foreground">No decks to schedule yet—add cards or run a session.</p>
          ) : (
            <>
              <div className="w-full px-3 sm:px-4 lg:px-8">
                <HorizontalCarousel
                  className="w-full"
                  items={items}
                  initialIndex={initialIndex}
                  bleed={bleed}
                  gap={gap}
                  onIndexChange={setCarouselIndex}
                  getItemId={deck => deck.deckId}
                  renderControls={({ activeIndex, onPrev, onNext }) => {
                    controlsRef.current = { onPrev, onNext };
                    return (
                      <div className="flex items-center justify-center gap-4">
                        <Button variant="outline" size="sm" onClick={onPrev} className="rounded-full">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {items.map((_, index) => {
                            const isActive = activeIndex === index;
                            return (
                              <span
                                key={index}
                                className={cn(
                                  'h-6 rounded-full transition-all',
                                  isActive ? 'w-10 bg-primary' : 'w-6 bg-muted'
                                )}
                                aria-label={`Deck ${index + 1}`}
                              />
                            );
                          })}
                        </div>
                        <Button variant="outline" size="sm" onClick={onNext} className="rounded-full">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  }}
                  renderItem={(deck, _index, state) => {
                    const isActive = state.isActive;
                    return (
                      <div
                        className={cn(
                          'rounded-3xl bg-background dark:bg-black p-8 min-h-[280px] flex flex-col justify-between transition-all cursor-pointer',
                          'shadow-[0_25px_80px_rgba(15,23,42,0.12)] hover:shadow-[0_25px_100px_rgba(15,23,42,0.2)]',
                          isActive && 'shadow-[0_25px_100px_rgba(15,23,42,0.2)]'
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="text-2xl font-bold text-foreground">{deck.deckTitle}</h3>
                            <span className="text-2xl font-bold text-foreground whitespace-nowrap ml-2">
                              {(deck.statusCounts.struggling ?? 0) + (deck.statusCounts.good ?? 0) + (deck.statusCounts.mastered ?? 0)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {formatInactivity(deck.daysSinceLastReview ?? 0)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {deck.statusCounts.struggling > 0 && (
                              <span className="rounded-full bg-destructive/20 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
                                Struggling ({deck.statusCounts.struggling})
                              </span>
                            )}
                            {deck.statusCounts.good > 0 && (
                              <span className="rounded-full bg-secondary/20 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                                Good ({deck.statusCounts.good})
                              </span>
                            )}
                            {deck.statusCounts.mastered > 0 && (
                              <span className="rounded-full bg-success/20 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-success">
                                Mastered ({deck.statusCounts.mastered})
                              </span>
                            )}
                          </div>
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                              <span className="uppercase tracking-[0.2em]">Mastery</span>
                              <span className="text-foreground font-semibold">{toPercent(deck.mastery)}</span>
                            </div>
                            <Progress value={deck.mastery} className="h-1.5" />
                          </div>
                        </div>
                        <div className="mt-4">
                          <DeckContent deck={deckAnalytics ?? null} />
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
