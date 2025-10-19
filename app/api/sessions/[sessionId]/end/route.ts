import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionManager } from '@/lib/sessions/session-manager';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;
    const { status = 'completed' } = await request.json();
    
    const manager = await getSessionManager(session.user.email, sessionId);
    const endedSession = await manager.endSession(status);

    return NextResponse.json(endedSession);
  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}