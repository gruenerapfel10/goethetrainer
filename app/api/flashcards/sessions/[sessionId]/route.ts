import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { FlashcardSessionOrchestrator } from '@/lib/flashcards/session-orchestrator';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const sessionUser = await auth();
    if (!sessionUser?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resolvedParams = await params;
    const session = await FlashcardSessionOrchestrator.getSession(sessionUser.user.email, resolvedParams.sessionId);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Session not found' },
      { status: 404 }
    );
  }
}
