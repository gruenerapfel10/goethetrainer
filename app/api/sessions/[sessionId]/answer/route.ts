import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionManager } from '@/lib/sessions/session-manager';

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questionId, answer, timeSpent = 0, hintsUsed = 0 } = await request.json();
    if (!questionId) {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400 }
      );
    }

    const { sessionId } = params;
    const manager = await getSessionManager(authSession.user.email, sessionId);

    const result = await manager.submitAnswer(
      questionId,
      answer,
      timeSpent,
      hintsUsed
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
