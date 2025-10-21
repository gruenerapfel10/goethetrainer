import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { endSessionForUser } from '@/lib/sessions/session-service';
import type { SessionStatus } from '@/lib/sessions/types';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await auth();

    if (!authSession?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      status?: SessionStatus;
    };

    const endedSession = await endSessionForUser(
      sessionId,
      authSession.user.email,
      body.status ?? 'completed'
    );

    return NextResponse.json(endedSession);
  } catch (error) {
    console.error('Error ending session:', error);
    const status =
      typeof (error as any)?.statusCode === 'number'
        ? (error as any).statusCode
        : 500;
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status }
    );
  }
}
