import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { FlashcardSessionOrchestrator } from '@/lib/flashcards/session-orchestrator';
import { DeckRepository } from '@/lib/flashcards/repository/supabase-repo';
import { FeedbackRating } from '@/lib/flashcards/types';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const sessionUser = await auth();
  if (!sessionUser?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { feedback } = body;
  if (typeof feedback !== 'number') {
    return NextResponse.json({ error: 'feedback is required' }, { status: 400 });
  }
  try {
    const resolvedParams = await context.params;
    const session = await FlashcardSessionOrchestrator.answerCard(
      sessionUser.user.id,
      resolvedParams.sessionId,
      feedback as FeedbackRating
    );
    const deck = session ? await DeckRepository.get(sessionUser.user.id, session.deckId) : null;
    return NextResponse.json({ session, deck });
  } catch (error) {
    console.error('Failed to record flashcard answer', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record answer' },
      { status: 400 }
    );
  }
}
