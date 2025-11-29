import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { FlashcardSessionOrchestrator } from '@/lib/flashcards/session-orchestrator';
import { DeckRepository } from '@/lib/flashcards/repository/supabase-repo';

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const sessionUser = await auth();
    if (!sessionUser?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resolvedParams = await context.params;
    const session = await FlashcardSessionOrchestrator.getSession(sessionUser.user.id, resolvedParams.sessionId);
    const deck = session ? await DeckRepository.get(sessionUser.user.id, session.deckId) : null;
    return NextResponse.json({ session, deck });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Session not found' },
      { status: 404 }
    );
  }
}
