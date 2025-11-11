import 'server-only';

import Parser from 'rss-parser';
import { adminDb } from '@/lib/firebase/admin';

export interface NewsTopic {
  id: string;
  theme: string;
  headline: string;
  summary: string;
  source?: string;
  publishedAt?: string;
  url?: string;
}

const RSS_FEEDS: Array<{ source: string; url: string; theme: string }> = [
  { source: 'Hacker News', url: 'https://news.ycombinator.com/rss', theme: 'TECHNOLOGIE' },
  { source: 'Nature', url: 'https://www.nature.com/nature.rss', theme: 'WISSENSCHAFT' },
  { source: 'The Guardian Politics', url: 'https://www.theguardian.com/politics/rss', theme: 'POLITIK' },
  { source: 'ESPN', url: 'https://www.espn.com/espn/rss/news', theme: 'SPORT' },
  { source: 'Variety', url: 'https://variety.com/feed/', theme: 'KULTUR' },
];

const parser = new Parser();
const FEED_ARTICLE_LIMIT = 40;
const TARGET_BATCH_SIZE = 100;
const BATCH_COLLECTION = 'news_pool';
const BATCH_DOC_ID = 'current';
const USER_STATE_COLLECTION = 'news_pool_users';
const BATCH_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredNewsArticle extends NewsTopic {
  fetchedAt: string;
}

interface NewsBatchDoc {
  articles: StoredNewsArticle[];
  fetchedAt: string;
  expiresAt: string;
}

interface UserNewsState {
  seenIds: string[];
  refreshedAt: string;
}

let batchRefreshPromise: Promise<NewsBatchDoc> | null = null;

function buildArticleId(source: string, rawId: string): string {
  const trimmed = rawId.trim().toLowerCase();
  if (!trimmed) {
    return `${source}:${Math.random().toString(36).slice(2)}`;
  }
  return `${source}:${trimmed}`;
}

function sanitizeSummary(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, 400);
}

function toStoredArticle(
  feed: (typeof RSS_FEEDS)[number],
  item: Parser.Item
): StoredNewsArticle | null {
  const identifier =
    item.guid ??
    (typeof (item as { id?: string }).id === 'string' ? (item as { id?: string }).id : undefined) ??
    item.link ??
    item.title ??
    '';
  if (!identifier) {
    return null;
  }

  const published = item.isoDate ?? item.pubDate ?? item.pubDate ?? undefined;
  const theme = feed.theme ?? 'AKTUELL';
  return {
    id: buildArticleId(feed.source, identifier),
    theme,
    headline: item.title ?? 'Aktuelle Meldung',
    summary: sanitizeSummary(item.contentSnippet ?? item.content ?? item.summary ?? ''),
    source: feed.source,
    publishedAt: published,
    url: item.link ?? undefined,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFeedEntries(
  feed: (typeof RSS_FEEDS)[number]
): Promise<StoredNewsArticle[]> {
  const feedData = await parser.parseURL(feed.url);
  const items = feedData.items.slice(0, FEED_ARTICLE_LIMIT);
  const articles: StoredNewsArticle[] = [];
  for (const item of items) {
    const article = toStoredArticle(feed, item);
    if (article) {
      articles.push(article);
    }
  }
  return articles;
}

async function collectArticles(): Promise<StoredNewsArticle[]> {
  const collected: StoredNewsArticle[] = [];
  for (const feed of RSS_FEEDS) {
    try {
      const entries = await fetchFeedEntries(feed);
      collected.push(...entries);
    } catch (error) {
      console.warn('[NewsPool] Failed to fetch feed', feed.source, error);
    }
  }

  const cutoff = Date.now() - BATCH_TTL_MS;
  const deduped = new Map<string, StoredNewsArticle>();
  for (const article of collected) {
    const publishedTime = article.publishedAt ? new Date(article.publishedAt).getTime() : Date.now();
    if (Number.isFinite(publishedTime) && publishedTime < cutoff) {
      continue;
    }
    if (!deduped.has(article.id)) {
      deduped.set(article.id, article);
    }
  }

  const sorted = Array.from(deduped.values()).sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });

  return sorted.slice(0, TARGET_BATCH_SIZE);
}

async function readNewsBatch(): Promise<NewsBatchDoc | null> {
  try {
    const doc = await adminDb.collection(BATCH_COLLECTION).doc(BATCH_DOC_ID).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data() as NewsBatchDoc;
    if (!Array.isArray(data?.articles)) {
      return null;
    }
    return {
      articles: data.articles,
      fetchedAt: data.fetchedAt,
      expiresAt: data.expiresAt,
    };
  } catch (error) {
    console.error('[NewsPool] Failed to read batch', error);
    return null;
  }
}

async function refreshNewsBatch(): Promise<NewsBatchDoc> {
  if (batchRefreshPromise) {
    return batchRefreshPromise;
  }

  batchRefreshPromise = (async () => {
    const articles = await collectArticles();
    const now = new Date();
    const doc: NewsBatchDoc = {
      articles,
      fetchedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + BATCH_TTL_MS).toISOString(),
    };
    await adminDb.collection(BATCH_COLLECTION).doc(BATCH_DOC_ID).set(doc);
    console.log('[NewsPool] Refreshed batch', { count: articles.length });
    return doc;
  })();

  try {
    return await batchRefreshPromise;
  } finally {
    batchRefreshPromise = null;
  }
}

async function ensureNewsBatch(force = false): Promise<NewsBatchDoc> {
  if (!force) {
    const existing = await readNewsBatch();
    const validUntil = existing?.expiresAt ? new Date(existing.expiresAt).getTime() : 0;
    if (
      existing &&
      existing.articles.length >= Math.min(20, TARGET_BATCH_SIZE) &&
      validUntil > Date.now()
    ) {
      return existing;
    }
  }
  return refreshNewsBatch();
}

async function readUserState(userId: string): Promise<UserNewsState | null> {
  try {
    const doc = await adminDb.collection(USER_STATE_COLLECTION).doc(userId).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data() as UserNewsState | undefined;
    if (!data) {
      return null;
    }
    return {
      seenIds: Array.isArray(data.seenIds) ? data.seenIds : [],
      refreshedAt: data.refreshedAt ?? new Date(0).toISOString(),
    };
  } catch (error) {
    console.error('[NewsPool] Failed to load user state', { userId }, error);
    return null;
  }
}

async function writeUserState(userId: string, state: UserNewsState): Promise<void> {
  try {
    await adminDb.collection(USER_STATE_COLLECTION).doc(userId).set(state, { merge: true });
  } catch (error) {
    console.error('[NewsPool] Failed to persist user state', { userId }, error);
  }
}

function isUserStateExpired(state: UserNewsState | null): boolean {
  if (!state) {
    return true;
  }
  const refreshed = new Date(state.refreshedAt).getTime();
  return Number.isNaN(refreshed) || refreshed + BATCH_TTL_MS <= Date.now();
}

const newsPickLocks = new Map<string, Promise<void>>();

async function withUserNewsLock<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const previous = newsPickLocks.get(userId) ?? Promise.resolve();
  let release: (() => void) | undefined;
  const current = new Promise<void>(resolve => {
    release = resolve;
  });
  newsPickLocks.set(
    userId,
    previous.then(() => current)
  );
  await previous;
  try {
    return await task();
  } finally {
    release?.();
    if (newsPickLocks.get(userId) === current) {
      newsPickLocks.delete(userId);
    }
  }
}

async function pickArticleForUser(userId: string): Promise<NewsTopic | null> {
  let batch = await ensureNewsBatch();
  if (!batch.articles.length) {
    return null;
  }

  let userState = await readUserState(userId);
  const nowIso = new Date().toISOString();
  if (
    isUserStateExpired(userState) ||
    (userState && userState.seenIds.length >= batch.articles.length)
  ) {
    userState = { seenIds: [], refreshedAt: nowIso };
  }

  const seenSet = new Set(userState?.seenIds ?? []);
  let available = batch.articles.filter(article => !seenSet.has(article.id));

  if (!available.length) {
    batch = await ensureNewsBatch(true);
    available = batch.articles;
    userState = { seenIds: [], refreshedAt: nowIso };
  }

  if (!available.length) {
    return null;
  }

  const choice = available[Math.floor(Math.random() * available.length)];
  const nextSeen = [...(userState?.seenIds ?? []), choice.id];
  await writeUserState(userId, {
    seenIds: nextSeen,
    refreshedAt: userState?.refreshedAt ?? nowIso,
  });
  return choice;
}

export async function getNewsTopicFromPool(userId?: string): Promise<NewsTopic | null> {
  if (userId) {
    const userArticle = await withUserNewsLock(userId, () => pickArticleForUser(userId));
    if (userArticle) {
      return userArticle;
    }
  }

  const batch = await ensureNewsBatch();
  if (!batch.articles.length) {
    return null;
  }
  const index = Math.floor(Math.random() * batch.articles.length);
  return batch.articles[index];
}

export async function refreshNewsPool(): Promise<void> {
  await refreshNewsBatch();
}
