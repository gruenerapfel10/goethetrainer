import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { updateSessionForUser } from '@/lib/sessions/session-service';
import type { UpdateSessionInput } from '@/lib/sessions/types';

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
    const input = (await request.json().catch(() => ({}))) as UpdateSessionInput;

    const updatedSession = await updateSessionForUser(
      sessionId,
      authSession.user.email,
      input
    );

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    const status =
      typeof (error as any)?.statusCode === 'number'
        ? (error as any).statusCode
        : 500;
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status }
    );
  }
}
