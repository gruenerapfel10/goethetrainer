import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { FlashcardSessionOrchestrator } from '@/lib/flashcards/session-orchestrator';

export async function POST(request: Request) {
  const sessionUser = await auth();
  if (!sessionUser?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { deckId } = body;
  if (!deckId) {
    return NextResponse.json({ error: 'deckId required' }, { status: 400 });
  }
  try {
    const session = await FlashcardSessionOrchestrator.startSession(sessionUser.user.email, deckId);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start session' },
      { status: 400 }
    );
  }
}
