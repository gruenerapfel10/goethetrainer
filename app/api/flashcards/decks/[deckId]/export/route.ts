import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { DeckRepository } from '@/lib/flashcards/repository/supabase-repo';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const resolvedParams = await params;
  const deck = await DeckRepository.get(session.user.id, resolvedParams.deckId);
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }
  return NextResponse.json(deck);
}
