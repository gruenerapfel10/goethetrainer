import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { FlashcardAnalytics } from '@/lib/flashcards/analytics/aggregator';

export async function GET(
  _request: Request,
  context: { params: Promise<{ deckId: string }> } | { params: { deckId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { deckId } = await context.params;
    if (!deckId) {
      return NextResponse.json({ error: 'Deck ID is required' }, { status: 400 });
    }
    const analytics = await FlashcardAnalytics.getDeck(session.user.email, deckId);
    return NextResponse.json({ analytics });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load deck analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
