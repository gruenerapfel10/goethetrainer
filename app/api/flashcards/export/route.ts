import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { DeckRepository } from '@/lib/flashcards/repository/memory-repo';
import { deckToCsv } from '@/lib/flashcards/export/csv-exporter';
import { deckToAnkiTxt } from '@/lib/flashcards/export/anki/text-export';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { deckId, format } = await request.json();
  if (!deckId) {
    return NextResponse.json({ error: 'deckId required' }, { status: 400 });
  }
  const deck = await DeckRepository.get(session.user.email, deckId);
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  if (format === 'anki') {
    const txt = deckToAnkiTxt(deck);
    return new NextResponse(txt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${deck.title || 'deck'}.txt"`,
      },
    });
  }

  const csv = deckToCsv(deck);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${deck.title || 'deck'}.csv"`,
    },
  });
}
