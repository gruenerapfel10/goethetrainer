'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Flashcard } from '@/components/flashcards/Flashcard';
import type { FlashcardSession, Deck, CardTemplate, ReviewEvent } from '@/lib/flashcards/types';
import { FlashcardAlgorithm } from '@/lib/flashcards/types';
import { SessionConfig } from '@/components/flashcards/SessionConfig';
import { FeedbackRating } from '@/lib/flashcards/types';
import { getFeedbackPolicy } from '@/lib/flashcards/feedback/policies';
import { toast } from 'sonner';
import { FlashcardSessionComplete } from './complete';
import { useHotkeys } from 'react-hotkeys-hook';
import { CornerDownLeft } from 'lucide-react';

type SessionResponse = { session: FlashcardSession; deck?: Deck };

export default function FlashcardSessionPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<FlashcardSession | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnswering, setIsAnswering] = useState(false);
  const [studyMode, setStudyMode] = useState<'flashcard' | 'typing'>('flashcard');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typingResult, setTypingResult] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<FlashcardSession | null>(null);
  const [awaitingAdvance, setAwaitingAdvance] = useState(false);
  const [answeredCard, setAnsweredCard] = useState<CardTemplate | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const [algorithmSelection, setAlgorithmSelection] = useState<FlashcardAlgorithm | null>(null);
  const shownAtRef = useRef<number | null>(null);

  const policyId = deck?.settings?.feedbackPolicyId ?? 'ternary';
  const feedbackPolicy = useMemo(() => {
    try {
      return getFeedbackPolicy(policyId);
    } catch {
      return getFeedbackPolicy('ternary');
    }
  }, [policyId]);

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/flashcards/sessions/${params.sessionId}`);
      const payload = (await response.json()) as SessionResponse;
      if (!response.ok) {
        throw new Error((payload as any)?.error ?? 'Failed to load session');
      }
      setSession(payload.session);
      if (payload.deck) setDeck(payload.deck);
      setShowAnswer(false);
      setTypedAnswer('');
      setTypingResult(null);
      setPendingSession(null);
      setAwaitingAdvance(false);
      setAnsweredCard(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [params.sessionId]);

  useEffect(() => {
    if (!params?.sessionId) return;
    void fetchSession();
  }, [fetchSession, params?.sessionId]);

  useEffect(() => {
    const modeParam = searchParams?.get('mode');
    if (modeParam === 'typing') {
      setStudyMode('typing');
    } else if (modeParam === 'flashcard') {
      setStudyMode('flashcard');
    }
  }, [searchParams]);

  useEffect(() => {
    setShowAnswer(false);
    setTypedAnswer('');
    setTypingResult(null);
    setPendingSession(null);
    setAwaitingAdvance(false);
    setAnsweredCard(null);
    setAlgorithmSelection(null);
  }, [session?.activeCard?.card.id, studyMode]);

  useEffect(() => {
    if (session?.algorithm) {
      setAlgorithmSelection(session.algorithm);
    }
  }, [session?.algorithm]);

  const answerCard = async (feedback: FeedbackRating) => {
    if (!session) return;
    const answeredAt = Date.now();
    const shownAt = shownAtRef.current;
    setAwaitingAdvance(true);
    setAnsweredCard(session.activeCard?.card ?? null);
    setShowAnswer(true);
    setIsAnswering(true);
    setPendingSession(buildOptimisticNextSession(session, feedback));
    try {
      const response = await fetch(`/api/flashcards/sessions/${session.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback,
          shownAt,
          answeredAt,
          dueAt: session.activeCard?.state.due ?? null,
          responseMs: shownAt ? answeredAt - shownAt : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to record answer');
      }
      setPendingSession(payload.session);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record answer';
      setError(message);
      toast.error(message);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleTypingSubmit = async () => {
    if (!session || !session.activeCard || awaitingAdvance) return;
    const expected = session.activeCard.card.back.trim().toLowerCase();
    const guess = typedAnswer.trim().toLowerCase();
    const correct = guess.length > 0 && guess === expected;
    try {
      await fetch(`/api/flashcards/sessions/${session.id}/interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: session.activeCard.card.id,
          deckId: session.deckId,
          eventType: 'typing_submit',
          metadata: {
            guessLength: guess.length,
            correct,
          },
        }),
      });
    } catch (e) {
      // non-blocking
    }
    setTypingResult(correct ? 'Correct!' : `Expected: ${session.activeCard.card.back}`);
    await answerCard(correct ? FeedbackRating.GOOD : FeedbackRating.AGAIN);
  };

  const advanceToNextCard = () => {
    if (pendingSession) {
      setSession(pendingSession);
    }
    setPendingSession(null);
    setAwaitingAdvance(false);
    setShowAnswer(false);
    setTypingResult(null);
    setAnsweredCard(null);
  };

  const activeCard: CardTemplate | null =
    (awaitingAdvance && answeredCard) ? answeredCard : session?.activeCard?.card ?? null;
  useEffect(() => {
    shownAtRef.current = session?.activeCard ? Date.now() : null;
  }, [session?.activeCard?.card.id]);
  const sessionForMeta = pendingSession ?? session;
  const queueCount = sessionForMeta
    ? (sessionForMeta.remainingQueue?.length ?? 0) + (sessionForMeta.activeCard ? 1 : 0)
    : 0;
  const devMode = process.env.NODE_ENV === 'development';
  const currentAlgorithm: 'faust' | 'sequential' =
    (algorithmSelection ?? session?.algorithm ?? FlashcardAlgorithm.FAUST) === FlashcardAlgorithm.SEQUENTIAL
      ? 'sequential'
      : 'faust';
  const correctCount =
    session?.completed.filter(ev => ev.feedback === FeedbackRating.GOOD || ev.feedback === FeedbackRating.EASY).length ??
    0;
  const incorrectCount =
    session?.completed.filter(ev => ev.feedback === FeedbackRating.AGAIN || ev.feedback === FeedbackRating.HARD).length ??
    0;
  const accuracyPct =
    session && session.completed.length > 0
      ? Math.round((correctCount / session.completed.length) * 100)
      : 0;
  const isFormFocus = () => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return el.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  };

  const buildOptimisticNextSession = (current: FlashcardSession, feedback: FeedbackRating) => {
    if (!current.activeCard) return current;
    const review: ReviewEvent = {
      cardId: current.activeCard.card.id,
      deckId: current.deckId,
      userId: current.userId,
      timestamp: Date.now(),
      feedback,
      prevInterval: current.activeCard.state.interval,
      nextInterval: current.activeCard.state.interval,
    };
    const [next, ...rest] = current.remainingQueue;
    return {
      ...current,
      activeCard: next ?? null,
      remainingQueue: rest,
      completed: [...current.completed, review],
    };
  };

  useHotkeys(
    'enter',
    event => {
      if (event.shiftKey) return;
      if (awaitingAdvance) {
        event.preventDefault();
        advanceToNextCard();
        return;
      }
      const isInputActive =
        answerInputRef.current &&
        (document.activeElement === answerInputRef.current ||
          answerInputRef.current.contains(document.activeElement));
      if (!isInputActive) return;
      event.preventDefault();
      void handleTypingSubmit();
    },
    {
      enableOnFormTags: true,
      keydown: true,
      keyup: false,
      preventDefault: false,
      enabled: studyMode === 'typing',
    },
    [awaitingAdvance, studyMode]
  );

  useHotkeys(
    'enter',
    event => {
      if (event.shiftKey) return;
      if (isFormFocus()) return;
      event.preventDefault();
      if (awaitingAdvance) {
        advanceToNextCard();
        return;
      }
      void answerCard(FeedbackRating.GOOD);
    },
    {
      keydown: true,
      keyup: false,
      preventDefault: false,
      enabled: studyMode === 'flashcard',
    },
    [awaitingAdvance, studyMode]
  );

  useHotkeys(
    'tab',
    event => {
      if (studyMode !== 'flashcard') return;
      if (isFormFocus()) return;
      event.preventDefault();
      setShowAnswer(prev => !prev);
    },
    {
      keydown: true,
      keyup: false,
      preventDefault: false,
      enabled: studyMode === 'flashcard',
    },
    [studyMode]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-3xl rounded-3xl border border-border bg-card shadow-lg p-8 animate-pulse">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-32 rounded-full bg-muted" />
              <div className="h-6 w-64 rounded-full bg-muted" />
            </div>
            <div className="h-9 w-24 rounded-full bg-muted" />
          </div>
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 min-h-[260px] flex items-center justify-center">
            <p className="text-xl font-semibold text-foreground">Loading flashcard session…</p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <div className="h-10 w-28 rounded-full bg-muted" />
            <div className="h-10 w-28 rounded-full bg-muted" />
            <div className="h-10 w-28 rounded-full bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="secondary" onClick={() => void fetchSession()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Session not found.</p>
      </div>
    );
  }

  if (!session.activeCard) {
    return <FlashcardSessionComplete />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Flashcards</p>
          <h1 className="text-2xl font-semibold text-foreground">
            {deck?.title ?? 'Flashcard Session'}
          </h1>
        </div>
        <Button variant="ghost" onClick={() => router.push('/flashcards')}>
          Back to decks
        </Button>
      </div>

      {session.activeCard ? (
        <div className="space-y-4">
        {devMode ? (
          <div className="flex flex-wrap items-center gap-2">
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
            <SessionConfig
              className="ml-2"
              showRunnerToggle={false}
              algorithm={currentAlgorithm}
              onAlgorithmChange={algo =>
                setAlgorithmSelection(algo === 'faust' ? FlashcardAlgorithm.FAUST : FlashcardAlgorithm.SEQUENTIAL)
              }
              applyLabel="Apply"
              onApply={
                algorithmSelection && algorithmSelection !== session?.algorithm && session?.deckId
                  ? async () => {
                      try {
                        const response = await fetch('/api/flashcards/sessions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            deckId: session.deckId,
                            mode: session.deckMode ?? 'finite',
                            algorithm:
                              algorithmSelection === FlashcardAlgorithm.SEQUENTIAL ? 'sequential' : 'faust',
                          }),
                        });
                        const payload = await response.json();
                        if (response.ok && payload.session?.id) {
                          router.replace(`/flashcards/session/${payload.session.id}?mode=${studyMode}`);
                        } else {
                          toast.error(payload?.error ?? 'Failed to switch algorithm');
                        }
                      } catch (err) {
                        toast.error('Failed to switch algorithm');
                      }
                    }
                  : undefined
              }
              disabledApply={!algorithmSelection || algorithmSelection === session?.algorithm}
            />
          </div>
        ) : null}

          <div className="flex flex-col rounded-2xl border border-border bg-background overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 px-6 pt-4">
              <span className="rounded-full bg-green-100 text-green-700 text-xs font-semibold px-3 py-1">
                Correct: {correctCount}
              </span>
              <span className="rounded-full bg-red-100 text-red-700 text-xs font-semibold px-3 py-1">
                Incorrect: {incorrectCount}
              </span>
              <span className="rounded-full bg-muted text-foreground text-xs font-semibold px-3 py-1">
                Accuracy: {accuracyPct}%
              </span>
            </div>
            {/* Card Content */}
            <div className="flex-1 p-8 sm:p-12 flex flex-col items-center justify-center min-h-[300px] text-center">
              {activeCard ? (
                studyMode === 'flashcard' ? (
                  <Flashcard
                    card={activeCard}
                    showHint={!showAnswer}
                    isFlipped={showAnswer}
                    onFlip={flipped => setShowAnswer(flipped)}
                    containerClassName="w-full h-full flex flex-col items-center justify-center"
                  />
                ) : (
                  <p className="text-3xl font-semibold text-foreground">
                    {activeCard.front}
                  </p>
                )
              ) : (
                <p className="text-muted-foreground">Loading card…</p>
              )}
            </div>

            {/* Card Footer */}
            <div className="px-6 sm:px-8 py-4">
              {studyMode === 'flashcard' ? (
                <div className="flex flex-wrap gap-2 justify-center items-center">
                  {feedbackPolicy.options.map(option => (
                    <Button
                      key={option.label}
                      className="rounded-full"
                      variant={option.tone === 'danger' ? 'destructive' : option.tone === 'warning' ? 'secondary' : 'default'}
                      disabled={isAnswering || awaitingAdvance}
                      onClick={() => void answerCard(option.rating)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p
                    className={`min-h-[1.25rem] text-sm font-medium text-center ${
                      typingResult?.startsWith('Correct') ? 'text-green-600' : typingResult ? 'text-red-600' : 'text-foreground'
                    }`}
                  >
                    {typingResult ?? ''}
                  </p>
                  <input
                    className="w-full bg-transparent px-0 py-3 text-lg font-bold text-foreground border-0 border-b-2 border-dotted border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/40 rounded-none"
                    placeholder="Type your answer"
                    value={typedAnswer}
                    ref={answerInputRef}
                    onChange={e => setTypedAnswer(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      className="rounded-full"
                      disabled={isAnswering && !pendingSession}
                      onClick={() => {
                        if (awaitingAdvance) {
                          advanceToNextCard();
                        } else {
                          void handleTypingSubmit();
                        }
                      }}
                    >
                      <span className="flex items-center gap-2">
                        {awaitingAdvance ? 'Next card' : 'Submit'}
                        <CornerDownLeft className="h-4 w-4 opacity-80" />
                      </span>
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
              {awaitingAdvance && studyMode === 'flashcard' ? (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={advanceToNextCard}
                    disabled={isAnswering && !pendingSession}
                  >
                    Next card
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border/50 bg-card/50 p-6 text-sm text-muted-foreground">
          Session complete. Back to decks to start another.
        </div>
      )}
    </div>
  );
}
