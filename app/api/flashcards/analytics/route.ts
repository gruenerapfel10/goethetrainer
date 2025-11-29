import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { FlashcardAnalytics } from '@/lib/flashcards/analytics/aggregator';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await FlashcardAnalytics.getAll(session.user.id);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
