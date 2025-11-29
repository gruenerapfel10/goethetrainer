import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { FlashcardSessionOrchestrator } from '@/lib/flashcards/session-orchestrator';
import { DeckRepository } from '@/lib/flashcards/repository/supabase-repo';
import { FlashcardAlgorithm } from '@/lib/flashcards/types';

export async function POST(request: Request) {
  const sessionUser = await auth();
  if (!sessionUser?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { deckId, mode } = body;
  const algorithmInput = typeof body.algorithm === 'string' ? body.algorithm.toLowerCase() : null;
  const algorithm =
    algorithmInput === FlashcardAlgorithm.SEQUENTIAL
      ? FlashcardAlgorithm.SEQUENTIAL
      : FlashcardAlgorithm.FAUST;
  if (!deckId) {
    return NextResponse.json({ error: 'deckId required' }, { status: 400 });
  }
  const runnerMode: 'finite' | 'infinite' = mode === 'infinite' ? 'infinite' : 'finite';
  try {
    const session = await FlashcardSessionOrchestrator.startSession(
      sessionUser.user.id,
      deckId,
      runnerMode,
      algorithm
    );
    const deck = await DeckRepository.get(sessionUser.user.id, deckId);
    return NextResponse.json({ session, deck });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start session' },
      { status: 400 }
    );
  }
}
