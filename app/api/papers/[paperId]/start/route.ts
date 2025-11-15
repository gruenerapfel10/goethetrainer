import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createSessionFromPaper } from '@/lib/sessions/session-controller';

export async function POST(request: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paperId } = await params;
    if (!paperId) {
      return NextResponse.json({ error: 'Paper ID required' }, { status: 400 });
    }

    const payload = await request.json().catch(() => ({}));

    const newSession = await createSessionFromPaper(session.user.email, paperId, payload.metadata);
    return NextResponse.json(newSession);
  } catch (error) {
    console.error('Error starting session from paper:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start from paper' },
      { status: 500 }
    );
  }
}
