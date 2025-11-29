'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Flashcard } from '@/components/flashcards/Flashcard';
import type { FlashcardSession, Deck, CardTemplate } from '@/lib/flashcards/types';
import { FeedbackRating } from '@/lib/flashcards/types';
import { getFeedbackPolicy } from '@/lib/flashcards/feedback/policies';
import { toast } from 'sonner';
import { FlashcardSessionComplete } from './complete';

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
  }, [session?.activeCard?.card.id, studyMode]);

  const answerCard = async (feedback: FeedbackRating) => {
    if (!session) return;
    setIsAnswering(true);
    try {
      const response = await fetch(`/api/flashcards/sessions/${session.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to record answer');
      }
      setSession(payload.session);
      setShowAnswer(false);
      setTypedAnswer('');
      setTypingResult(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record answer';
      setError(message);
      toast.error(message);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleTypingSubmit = async () => {
    if (!session || !session.activeCard || isAnswering) return;
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
    setTypedAnswer('');
    await answerCard(correct ? FeedbackRating.GOOD : FeedbackRating.AGAIN);
  };

  const activeCard: CardTemplate | null = session?.activeCard?.card ?? null;
  const queueCount = session ? (session.remainingQueue?.length ?? 0) + (session.activeCard ? 1 : 0) : 0;
  const devMode = process.env.NODE_ENV === 'development';

  if (!session?.activeCard) {
    return <FlashcardSessionComplete />;
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading flashcard session…</p>
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Flashcards</p>
          <h1 className="text-2xl font-semibold text-foreground">
            {deck?.title ?? 'Flashcard Session'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Queue: {queueCount} · Completed: {session.completed.length}
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/flashcards')}>
          Back to decks
        </Button>
      </div>

      {session.activeCard ? (
        <div className="space-y-4">
        {devMode ? (
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
        ) : null}

          <div className="flex flex-col rounded-2xl border border-border bg-background overflow-hidden">
            {/* Card Content */}
            <div className="flex-1 p-8 sm:p-12 flex flex-col items-center justify-center min-h-[300px] text-center">
              {studyMode === 'flashcard' ? (
                <Flashcard card={activeCard} showHint={!showAnswer} isFlipped={showAnswer} onFlip={flipped => setShowAnswer(flipped)} containerClassName="w-full h-full flex flex-col items-center justify-center" />
              ) : (
                <p className="text-3xl font-semibold text-foreground">
                  {activeCard.front}
                </p>
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
                      disabled={isAnswering}
                      onClick={() => void answerCard(option.rating)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    className="w-full bg-transparent px-0 py-3 text-lg font-bold text-foreground border-0 border-b-2 border-dotted border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/40 rounded-none"
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
                    <p className="text-sm text-muted-foreground text-center">{typingResult}</p>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center">
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
