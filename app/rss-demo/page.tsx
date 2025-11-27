'use client';

import { useEffect, useState } from 'react';

interface Topic {
  headline: string;
  summary: string;
  url?: string;
  source?: string;
  publishedAt?: string;
}

export default function RssDemoPage() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopic = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rss-demo');
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const data = await res.json();
      setTopic(data.topic as Topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTopic();
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">RSS Demo</h1>
        <p className="text-sm text-gray-600">
          Holt ein zufälliges Thema aus den freien RSS-Feeds (Tagesschau, DW, BBC, HN) via <code>/api/rss-demo</code>.
        </p>
      </header>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={fetchTopic}
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Lade ...' : 'Neuen Artikel holen'}
        </button>
        {error ? <span className="text-sm text-red-600">Fehler: {error}</span> : null}
      </div>

      {topic ? (
        <article className="rounded-md border border-gray-200 bg-white p-4 shadow-sm space-y-2">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              {topic.source ?? 'Unbekannte Quelle'}
              {topic.publishedAt ? ` • ${new Date(topic.publishedAt).toLocaleString()}` : ''}
            </div>
            <h2 className="text-xl font-semibold">{topic.headline}</h2>
          </div>
          <p className="text-sm leading-relaxed text-gray-800">{topic.summary}</p>
          {topic.url ? (
            <a
              href={topic.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Zum Artikel
            </a>
          ) : null}
        </article>
      ) : (
        <p className="text-sm text-gray-600">Noch kein Artikel geladen.</p>
      )}
    </main>
  );
}
