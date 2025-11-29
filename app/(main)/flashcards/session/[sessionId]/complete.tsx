'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, RefreshCw } from 'lucide-react';
import type { FlashcardSession, Deck } from '@/lib/flashcards/types';

type CompletionPayload = { session: FlashcardSession; deck?: Deck }; // placeholder; extend when analytics are ready

export function FlashcardSessionComplete() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [data, setData] = useState<CompletionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletion = useCallback(async () => {
    if (!params?.sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/flashcards/sessions/${params.sessionId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to load session');
      }
      setData(payload as CompletionPayload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load results';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [params?.sessionId]);

  useEffect(() => {
    void fetchCompletion();
  }, [fetchCompletion]);

  const total = useMemo(() => {
    const completed = data?.session?.completed?.length ?? 0;
    const remaining = data?.session?.remainingQueue?.length ?? 0;
    return completed + remaining + (data?.session?.activeCard ? 1 : 0);
  }, [data]);

  const completedCount = data?.session?.completed?.length ?? 0;
  const accuracy = useMemo(() => {
    if (!data?.session?.completed?.length) return 0;
    const correct = data.session.completed.filter(ev => ev.feedback === 2 || ev.feedback === 3).length;
    return Math.round((correct / data.session.completed.length) * 100);
  }, [data]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading results…</div>;
  }

  if (error || !data?.session) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-destructive">{error ?? 'Session not found'}</p>
        <Button variant="secondary" onClick={() => void fetchCompletion()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Flashcards</p>
          <h1 className="text-2xl font-semibold text-foreground">Session summary</h1>
          <p className="text-sm text-muted-foreground">{data.deck?.title ?? data.session.deckId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push('/flashcards')}>Back to decks</Button>
          <Button onClick={() => router.push(`/flashcards/session/${data.session.id}`)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Review again
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Cards completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">of {total} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{accuracy}%</div>
            <Progress value={accuracy} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold truncate">{data.session.schedulerId}</div>
            <p className="text-xs text-muted-foreground">Scheduler used</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <CardTitle>Performance</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">Placeholder until richer telemetry is surfaced</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Detailed graphs (per-card difficulty, intervals, hint usage, typing speed) will surface here once telemetry
            aggregation is wired.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
