'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, RefreshCw, Timer, Zap, Repeat, Activity, AlertCircle, Clock } from 'lucide-react';
import type { FlashcardSession, Deck, ReviewEvent } from '@/lib/flashcards/types';
import { cn } from '@/lib/utils';

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

  const feedbackBuckets = useMemo(() => {
    const events = data?.session?.completed ?? [];
    const counts = { again: 0, hard: 0, good: 0, easy: 0 };
    events.forEach(ev => {
      if (ev.feedback === 0) counts.again += 1;
      else if (ev.feedback === 1) counts.hard += 1;
      else if (ev.feedback === 2) counts.good += 1;
      else if (ev.feedback === 3) counts.easy += 1;
    });
    return counts;
  }, [data?.session?.completed]);

  const responseStats = useMemo(() => {
    const events = (data?.session?.completed ?? []).filter(ev => typeof ev.responseMs === 'number') as Array<
      ReviewEvent & { responseMs: number }
    >;
    if (!events.length) return { avg: null, p75: null, fast: null, slow: null };
    const sorted = [...events].sort((a, b) => (a.responseMs ?? 0) - (b.responseMs ?? 0));
    const sum = events.reduce((acc, ev) => acc + (ev.responseMs ?? 0), 0);
    const avg = Math.round(sum / events.length);
    const p75 = Math.round(sorted[Math.floor(sorted.length * 0.75)].responseMs ?? 0);
    const fast = sorted[0]?.responseMs ?? null;
    const slow = sorted[sorted.length - 1]?.responseMs ?? null;
    return { avg, p75, fast, slow };
  }, [data?.session?.completed]);

  const intervalStats = useMemo(() => {
    const events = data?.session?.completed ?? [];
    if (!events.length) return { avgDelta: null, maxDelta: null };
    const deltas = events.map(ev => (ev.nextInterval ?? ev.prevInterval ?? 0) - (ev.prevInterval ?? 0));
    const avgDelta = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
    const maxDelta = Math.max(...deltas);
    return { avgDelta, maxDelta };
  }, [data?.session?.completed]);

  const recentEvents = useMemo(
    () =>
      [...(data?.session?.completed ?? [])]
        .sort((a, b) => (b.answeredAt ?? b.timestamp ?? 0) - (a.answeredAt ?? a.timestamp ?? 0))
        .slice(0, 6),
    [data?.session?.completed]
  );

  const ratingLabel = (rating: number) => {
    if (rating === 0) return 'Again';
    if (rating === 1) return 'Hard';
    if (rating === 2) return 'Good';
    if (rating === 3) return 'Easy';
    return String(rating);
  };

  const timeline = useMemo(() => {
    const events = [...(data?.session?.completed ?? [])].sort(
      (a, b) => (a.answeredAt ?? a.timestamp ?? 0) - (b.answeredAt ?? b.timestamp ?? 0)
    );
    return events.map((ev, idx) => ({
      idx: idx + 1,
      label: ratingLabel(ev.feedback),
      response: ev.responseMs ?? null,
      interval: ev.nextInterval ?? ev.prevInterval ?? 0,
      time: ev.answeredAt ?? ev.timestamp ?? Date.now(),
    }));
  }, [data?.session?.completed]);

  const retentionEstimates = useMemo(() => {
    const events = timeline;
    if (!events.length) return { day1: null, day7: null };
    const p = (days: number) => {
      const vals = events
        .map(ev => {
          const ivl = ev.interval || 1;
          return Math.exp(-Math.max(0, days) / Math.max(1, ivl));
        })
        .filter(Number.isFinite);
      if (!vals.length) return null;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return Math.round(avg * 100);
    };
    return { day1: p(1), day7: p(7) };
  }, [timeline]);

  const nextDue = useMemo(() => {
    const events = timeline;
    if (!events.length) return null;
    const dayMs = 24 * 60 * 60 * 1000;
    const dueTimes = events
      .map(ev => ev.time + Math.max(0, ev.interval) * dayMs)
      .filter(Number.isFinite);
    if (!dueTimes.length) return null;
    const minDue = Math.min(...dueTimes);
    const deltaMs = minDue - Date.now();
    if (deltaMs <= 0) return 'Due now';
    const hours = Math.round(deltaMs / (60 * 60 * 1000));
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  }, [timeline]);

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

  const retentionCopy = [
    retentionEstimates.day1 !== null ? `${retentionEstimates.day1}% at 24h` : null,
    retentionEstimates.day7 !== null ? `${retentionEstimates.day7}% at 7d` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
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

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Accuracy</p>
            <p className="text-5xl font-bold">{accuracy}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              {completedCount} cards · {data.session.schedulerId}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
            <span>Retention est: {retentionCopy || '—'}</span>
            {nextDue && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> Next due ~{nextDue}</span>}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent cards</CardTitle>
          <span className="text-xs text-muted-foreground">Last {recentEvents.length} answers</span>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No answers recorded.</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((ev, idx) => (
                <div
                  key={`${ev.cardId}-${idx}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{ratingLabel(ev.feedback)}</span>
                    <span className="text-[11px] text-muted-foreground">
                      Interval {ev.prevInterval ?? 0} → {ev.nextInterval ?? ev.prevInterval ?? 0} d
                    </span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{ev.responseMs ? `${ev.responseMs} ms` : '—'}</div>
                    <div>{new Date(ev.answeredAt ?? ev.timestamp ?? Date.now()).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
