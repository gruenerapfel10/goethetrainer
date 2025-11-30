import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionById } from '@/lib/sessions/queries';
import { updateSessionForUser } from '@/lib/sessions/session-service';
import type { UpdateSessionInput } from '@/lib/sessions/types';

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await context.params;
    const session = await getSessionById(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.userId !== authSession.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('[api/sessions/:id] fetched session', {
      sessionId,
      status: session.status,
      questions: Array.isArray(session.data?.questions) ? session.data.questions.length : null,
      generation: session.data?.generation,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

async function handleSessionUpdate(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as UpdateSessionInput;
    const updated = await updateSessionForUser(
      sessionId,
      authSession.user.id,
      payload
    );

    return NextResponse.json(updated);
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  return handleSessionUpdate(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  return handleSessionUpdate(request, context);
}
