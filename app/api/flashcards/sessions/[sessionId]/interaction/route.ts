import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { InteractionRepository } from '@/lib/flashcards/repository/interaction-repo';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const sessionUser = await auth();
  if (!sessionUser?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { cardId, deckId, eventType, metadata } = body;
  if (!cardId || !deckId || !eventType) {
    return NextResponse.json({ error: 'cardId, deckId, eventType required' }, { status: 400 });
  }
  try {
    const resolvedParams = await context.params;
    await InteractionRepository.log({
      userId: sessionUser.user.id,
      deckId,
      sessionId: resolvedParams.sessionId,
      cardId,
      eventType,
      metadata,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record interaction' },
      { status: 400 }
    );
  }
}
