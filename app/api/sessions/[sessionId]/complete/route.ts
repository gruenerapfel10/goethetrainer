import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { completeSessionForUser } from '@/lib/sessions/session-service';

export async function POST(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await context.params;
    const results = await completeSessionForUser(
      sessionId,
      authSession.user.id
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error completing session:', error);
    const status =
      typeof (error as any)?.statusCode === 'number'
        ? (error as any).statusCode
        : 500;
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status }
    );
  }
}
