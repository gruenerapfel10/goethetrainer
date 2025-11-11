import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getUserSessions } from '@/lib/sessions/queries';
import type { SessionTypeEnum } from '@/lib/sessions/session-registry';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const typeParam = request.nextUrl.searchParams.get('type');
    const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '1000'); // Fetch all sessions

    if (!typeParam) {
      return NextResponse.json({ error: 'Type parameter required' }, { status: 400 });
    }

    const sessions = await getUserSessions(session.user.email, typeParam as SessionTypeEnum, limit);
    console.log('[sessions][by-type]', {
      user: session.user.email,
      type: typeParam,
      limit,
      returned: sessions.length,
      latestIds: sessions.slice(0, 3).map(s => s.id),
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error getting sessions by type:', error);
    return NextResponse.json(
      { error: 'Failed to get sessions' },
      { status: 500 }
    );
  }
}
