import Parser from 'rss-parser';

export interface NewsTopic {
  theme: string;
  headline: string;
  summary: string;
  source?: string;
  publishedAt?: string;
}

const RSS_FEEDS: Array<{ source: string; url: string; theme: string }> = [
  { source: 'Hacker News', url: 'https://news.ycombinator.com/rss', theme: 'TECHNOLOGIE' },
  { source: 'Nature', url: 'https://www.nature.com/nature.rss', theme: 'WISSENSCHAFT' },
  { source: 'The Guardian Politics', url: 'https://www.theguardian.com/politics/rss', theme: 'POLITIK' },
  { source: 'ESPN', url: 'https://www.espn.com/espn/rss/news', theme: 'SPORT' },
  { source: 'Variety', url: 'https://variety.com/feed/', theme: 'KULTUR' },
];

const parser = new Parser();
const ARTICLES_PER_FEED = 3;
const CACHE_TTL_MS = 30 * 60 * 1000;
const SEEN_TTL_MS = 24 * 60 * 60 * 1000;

let cachedTopics: NewsTopic[] = [];
let cacheExpiresAt = 0;
let refreshing: Promise<void> | null = null;
const seenArticles = new Map<string, number>();

interface NewsTopicEntry {
  topic: NewsTopic;
  key: string | null;
}

function pruneSeen(): void {
  const now = Date.now();
  for (const [key, expiry] of seenArticles.entries()) {
    if (expiry <= now) {
      seenArticles.delete(key);
    }
  }
}

function isArticleSeen(key: string | null): boolean {
  if (!key) {
    return false;
  }
  const expiry = seenArticles.get(key);
  if (!expiry) {
    return false;
  }
  if (expiry <= Date.now()) {
    seenArticles.delete(key);
    return false;
  }
  return true;
}

function markArticlesSeen(entries: NewsTopicEntry[]): void {
  const expiry = Date.now() + SEEN_TTL_MS;
  entries.forEach(entry => {
    if (entry.key) {
      seenArticles.set(entry.key, expiry);
    }
  });
}

async function fetchFeedEntries(
  feed: (typeof RSS_FEEDS)[number]
): Promise<NewsTopicEntry[]> {
  const result: NewsTopicEntry[] = [];
  const feedData = await parser.parseURL(feed.url);
  const items = feedData.items.slice(0, ARTICLES_PER_FEED);
  for (const item of items) {
    const identifier = item.guid ?? item.link ?? item.title ?? '';
    const cleanIdentifier = identifier.trim();
    const key = cleanIdentifier ? `${feed.source}:${cleanIdentifier}`.toLowerCase() : null;
    if (isArticleSeen(key)) {
      continue;
    }
    result.push({
      key,
      topic: {
        theme: feed.theme,
        headline: item.title ?? 'Aktuelle Meldung',
        summary:
          (item.contentSnippet ?? item.content ?? item.summary ?? '')
            .replace(/\s+/g, ' ')
            .slice(0, 280),
        source: feed.source,
        publishedAt: item.isoDate ?? item.pubDate ?? undefined,
      },
    });
  }
  return result;
}

async function refreshPool(): Promise<void> {
  if (refreshing) {
    await refreshing;
    return;
  }

  refreshing = (async () => {
    try {
      pruneSeen();
      const collected: NewsTopicEntry[] = [];
      for (const feed of RSS_FEEDS) {
        try {
          const entries = await fetchFeedEntries(feed);
          collected.push(...entries);
        } catch (error) {
          console.warn('[NewsPool] Failed to fetch feed', feed.source, error);
        }
      }
      if (collected.length) {
        cachedTopics = collected.map(entry => entry.topic);
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        markArticlesSeen(collected);
        console.log('[NewsPool] Refreshed article pool:', cachedTopics.length);
      }
    } finally {
      refreshing = null;
    }
  })();

  await refreshing;
}

export async function getNewsTopicFromPool(): Promise<NewsTopic | null> {
  const now = Date.now();
  if (!cachedTopics.length || now >= cacheExpiresAt) {
    await refreshPool();
  }

  if (!cachedTopics.length) {
    return null;
  }

  const index = Math.floor(Math.random() * cachedTopics.length);
  const [topic] = cachedTopics.splice(index, 1);
  return topic ?? null;
}
