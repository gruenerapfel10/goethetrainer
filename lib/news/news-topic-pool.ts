import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'rss-to-json';

export interface NewsTopic {
  headline: string;
  summary: string;
  url?: string;
  source?: string;
  publishedAt?: string;
  theme?: string;
}

let cached: NewsTopic[] | null = null;
let servedKeys: Set<string> = new Set();

const RSS_FEEDS = [
  // Germany/Europe centric feeds to keep content relevant
  'https://www.tagesschau.de/xml/rss2', // DE news
  'https://www.dw.com/atom', // Deutsche Welle
  'https://feeds.bbci.co.uk/news/world/rss.xml',
  'https://hnrss.org/frontpage',
];

function stripHtml(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function isRepoLink(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('github.com') || host.includes('gitlab.com') || host.includes('bitbucket.org');
  } catch {
    return false;
  }
}

function validSummary(text: string | undefined) {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (lower.includes('only available in paid plans')) return false;
  return text.length > 40;
}

function getTopicKey(topic: NewsTopic): string {
  return `${(topic.headline ?? '').trim().toLowerCase()}::${(topic.url ?? '').trim().toLowerCase()}`;
}

function isWithinDays(publishedAt: string | undefined, days: number): boolean {
  if (!publishedAt) return false;
  const ts = Date.parse(publishedAt);
  if (Number.isNaN(ts)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return ts >= cutoff;
}

async function loadFromRss(): Promise<NewsTopic[]> {
  const collected: NewsTopic[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const rss = await parse(feed);
      if (!rss?.items?.length) continue;
      for (const item of rss.items) {
        const headline = item.title ?? '';
        const summary =
          stripHtml(item.description) ||
          stripHtml((item as any).content) ||
          stripHtml((item as any).summary);

        if (!headline || !validSummary(summary)) continue;

        const url = item.link ?? (item as any).url;
        const publishedAt =
          typeof item.published === 'number'
            ? new Date(item.published).toISOString()
            : (item.published as string | undefined);

        if (isRepoLink(url)) continue;

        collected.push({
          headline,
          summary: summary.slice(0, 400),
          url,
          source: rss.title ?? new URL(url ?? feed).hostname,
          publishedAt,
        });
      }
    } catch {
      // ignore individual feed failures
    }
  }

  return collected;
}

async function loadFromLocal(): Promise<NewsTopic[]> {
  const files = [
    'fetched_articles_full.json',
    'fetched_articles.json',
    'diverse_news.json',
    'articles_with_content.json',
    'news.json',
  ];

  for (const file of files) {
    try {
      const filePath = path.join(process.cwd(), file);
      const raw = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        const topics = data
          .map((item: any) => {
            const headline = item.title || item.headline || '';
            const summary =
              item.ai_summary ||
              item.description ||
              item.summary ||
              (typeof item.content === 'string' ? stripHtml(item.content).slice(0, 500) : '') ||
              '';

            return {
              headline,
              summary,
              url: item.link || item.url || item.source_url,
              source: item.source_name || item.source || item.provider,
              publishedAt: item.pubDate || item.published,
            };
          })
          .filter(
            t =>
              t.headline &&
              validSummary(t.summary)
          );

        if (topics.length > 0) {
          return topics;
        }
      }
    } catch {
      // Ignore missing/invalid files
    }
  }

  return [];
}

async function loadTopics(): Promise<NewsTopic[]> {
  if (cached) return cached;

  const rssTopics = await loadFromRss();
  if (rssTopics.length) {
    // Deduplicate by headline/url and prioritize the last 7 days; if none in window, keep all.
    const seenKeys = new Set<string>();
    const recent: NewsTopic[] = [];
    const all: NewsTopic[] = [];
    for (const topic of rssTopics) {
      const key = getTopicKey(topic);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      all.push(topic);
      if (isWithinDays(topic.publishedAt, 7)) {
        recent.push(topic);
      }
    }
    const pool = (recent.length ? recent : all).sort(() => Math.random() - 0.5);
    cached = pool;
    servedKeys.clear();
    return cached;
  }

  cached = [
    {
      headline: 'Aktuelle Nachrichtenquelle fehlt',
      summary: 'Keine News-Themen gefunden; bitte Newsfeed aktualisieren (RSS).',
    },
  ];
  return cached;
}

export async function getNewsTopicFromPool(): Promise<NewsTopic> {
  const topics = await loadTopics();
  if (!topics.length) {
    return {
      headline: 'Aktuelle Nachricht nicht verfügbar',
      summary: 'Keine News-Themen gefunden; bitte Newsfeed aktualisieren.',
    };
  }

  // Reset the served set if we have exhausted the pool
  if (servedKeys.size >= topics.length) {
    servedKeys.clear();
  }

  // Find the first topic not served recently
  const shuffled = [...topics].sort(() => Math.random() - 0.5);
  const next = shuffled.find(topic => !servedKeys.has(getTopicKey(topic)));
  if (!next) {
    // Fallback: return a random topic
    const idx = Math.floor(Math.random() * topics.length);
    return topics[idx];
  }

  servedKeys.add(getTopicKey(next));
  return next;
}
