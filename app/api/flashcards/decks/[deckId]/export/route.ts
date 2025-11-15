import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { DeckRepository } from '@/lib/flashcards/repository/memory-repo';

export async function GET(
  _request: Request,
  { params }: { params: { deckId: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const deck = await DeckRepository.get(session.user.email, params.deckId);
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }
  return NextResponse.json(deck);
}
