import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { DeckRepository } from '@/lib/flashcards/repository/memory-repo';
import { FlashcardDeckType } from '@/lib/flashcards/types';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const status = url.searchParams.get('status') as 'draft' | 'published' | null;
  const decks = await DeckRepository.list(session.user.email, status ?? undefined);
  return NextResponse.json({ decks });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { title, description, categories, cards } = body;
  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  const sanitizedCategories = Array.isArray(categories)
    ? Array.from(new Set(categories.map((item: unknown) => String(item).trim()).filter(Boolean)))
    : [];
  const sanitizedCards = Array.isArray(cards)
    ? cards
        .map((card: any) => ({
          type: FlashcardDeckType.BASIC,
          front: typeof card.front === 'string' ? card.front.trim() : '',
          back: typeof card.back === 'string' ? card.back.trim() : '',
          hint: typeof card.hint === 'string' && card.hint.trim() ? card.hint.trim() : undefined,
          tags: Array.isArray(card.tags)
            ? Array.from(new Set(card.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean))) as string[]
            : undefined,
        }))
        .filter(card => card.front && card.back)
    : [];
  const deck = await DeckRepository.create(session.user.email, {
    title: title.trim(),
    description: typeof description === 'string' ? description.trim() : undefined,
    categories: sanitizedCategories,
    cards: sanitizedCards,
  });
  return NextResponse.json({ deck });
}
