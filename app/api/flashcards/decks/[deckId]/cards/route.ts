import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { DeckRepository } from '@/lib/flashcards/repository/supabase-repo';
import { FlashcardDeckType } from '@/lib/flashcards/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { front, back, hint, tags } = body;
  if (!front || !back) {
    return NextResponse.json({ error: 'front and back are required' }, { status: 400 });
  }
  try {
    const resolvedParams = await params;
    const deck = await DeckRepository.addCard(session.user.id, resolvedParams.deckId, {
      type: FlashcardDeckType.BASIC,
      front,
      back,
      hint,
      tags,
    });
    return NextResponse.json({ deck });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add card' },
      { status: 400 }
    );
  }
}
