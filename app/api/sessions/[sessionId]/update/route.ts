import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionManager } from '@/lib/sessions/session-manager';
import type { UpdateSessionInput } from '@/lib/sessions/types';

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
    const input = (await request.json().catch(() => ({}))) as UpdateSessionInput;

    const manager = await getSessionManager(authSession.user.email, sessionId);
    const updatedSession = await manager.updateSession(input);

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
