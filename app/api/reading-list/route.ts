import { auth } from '@/app/(auth)/auth';
import {
  addReadingListEntry,
  getReadingListEntries,
} from '@/lib/db/queries';
import { translateToEnglish } from '@/lib/ai/translation';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get('limit') ?? '25');
  // Allow larger result sets for client-side highlighting
  const limit = Number.isNaN(limitParam) ? 25 : Math.min(Math.max(limitParam, 1), 500);
  const cursor = searchParams.get('cursor');
  const search = searchParams.get('q');

  try {
    const result = await getReadingListEntries({
      userId: session.user.id,
      limit,
      cursor,
      search,
    });

    return new Response(
      JSON.stringify({
        items: result.items.map(entry => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
        })),
        nextCursor: result.nextCursor,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to fetch reading list entries:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch reading list entries.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const translation =
      typeof body?.translation === 'string' && body.translation.trim().length > 0
        ? body.translation.trim()
        : await translateToEnglish(text);

    const entry = await addReadingListEntry({
      userId: session.user.id,
      text,
      translation,
    });

    return new Response(
      JSON.stringify({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to save reading list entry:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to save reading list entry.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
