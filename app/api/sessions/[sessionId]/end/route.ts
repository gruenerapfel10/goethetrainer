import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { endSessionForUser } from '@/lib/sessions/session-controller';
import type { SessionStatus } from '@/lib/sessions/types';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await context.params;
    const payload = await request.json().catch(() => ({}));
    const status = (payload?.status ?? 'completed') as SessionStatus;

    const updated = await endSessionForUser(sessionId, session.user.id, status);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error ending session:', error);
    const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
    return NextResponse.json({ error: 'Failed to end session' }, { status: statusCode });
  }
}
