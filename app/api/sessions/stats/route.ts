import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getUserSessionStats } from '@/lib/sessions/queries';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getUserSessionStats(session.user.email);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting session stats:', error);
    return NextResponse.json(
      { error: 'Failed to get session stats' },
      { status: 500 }
    );
  }
}