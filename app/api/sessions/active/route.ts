import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getActiveSessions } from '@/lib/sessions/queries';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSessions = await getActiveSessions(session.user.id);
    return NextResponse.json(activeSessions);
  } catch (error) {
    console.error('Error getting active sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get active sessions' },
      { status: 500 }
    );
  }
}
