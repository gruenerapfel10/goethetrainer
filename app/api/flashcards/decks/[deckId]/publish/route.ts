import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { DeckRepository } from '@/lib/flashcards/repository/memory-repo';

export async function POST(
  _request: Request,
  { params }: { params: { deckId: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const deck = await DeckRepository.publish(session.user.email, params.deckId);
    return NextResponse.json({ deck });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish deck' },
      { status: 400 }
    );
  }
}
