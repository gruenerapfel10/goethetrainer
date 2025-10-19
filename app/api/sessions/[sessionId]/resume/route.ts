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
    const manager = await getSessionManager(session.user.email, sessionId);
    const updatedSession = await manager.resumeSession();

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error resuming session:', error);
    return NextResponse.json(
      { error: 'Failed to resume session' },
      { status: 500 }
    );
  }
}