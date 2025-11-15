import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { generateDraftsFromSource } from '@/lib/flashcards/card-draft-service';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { deckId, sourceId } = body;
  if (!deckId || !sourceId) {
    return NextResponse.json({ error: 'deckId and sourceId are required' }, { status: 400 });
  }
  try {
    const drafts = await generateDraftsFromSource(session.user.email, deckId, sourceId);
    return NextResponse.json({ drafts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate drafts' },
      { status: 400 }
    );
  }
}
