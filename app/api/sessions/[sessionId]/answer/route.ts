import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { submitAnswerForSession } from '@/lib/sessions/session-service';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questionId, answer, timeSpent, hintsUsed } = await request.json();
    if (!questionId) {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400 }
      );
    }
    if (typeof timeSpent !== 'number' || typeof hintsUsed !== 'number') {
      return NextResponse.json(
        { error: 'timeSpent and hintsUsed must be numbers' },
        { status: 400 }
      );
    }

    const { sessionId } = await context.params;
    const result = await submitAnswerForSession(
      sessionId,
      authSession.user.email,
      {
        questionId,
        answer,
        timeSpent,
        hintsUsed,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error submitting answer:', error);
    const status =
      typeof (error as any)?.statusCode === 'number'
        ? (error as any).statusCode
        : 500;
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status }
    );
  }
}
