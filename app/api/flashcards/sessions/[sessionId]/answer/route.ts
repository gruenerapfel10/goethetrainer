import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { FlashcardSessionOrchestrator } from '@/lib/flashcards/session-orchestrator';
import { FeedbackRating } from '@/lib/flashcards/types';

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const sessionUser = await auth();
  if (!sessionUser?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { feedback } = body;
  if (typeof feedback !== 'number') {
    return NextResponse.json({ error: 'feedback is required' }, { status: 400 });
  }
  try {
    const session = await FlashcardSessionOrchestrator.answerCard(
      sessionUser.user.email,
      params.sessionId,
      feedback as FeedbackRating
    );
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record answer' },
      { status: 400 }
    );
  }
}
