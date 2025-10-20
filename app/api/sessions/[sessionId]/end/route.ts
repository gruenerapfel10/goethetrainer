import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionManager } from '@/lib/sessions/session-manager';
import type { SessionStatus } from '@/lib/sessions/types';

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const authSession = await auth();

    if (!authSession?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = params;
    const body = (await request.json().catch(() => ({}))) as {
      status?: SessionStatus;
    };

    const manager = await getSessionManager(authSession.user.email, sessionId);
    const endedSession = await manager.endSession(body.status ?? 'completed');

    return NextResponse.json(endedSession);
  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}
