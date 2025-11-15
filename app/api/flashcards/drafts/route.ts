import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { CardDraftRepository } from '@/lib/flashcards/drafts-repository';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const deckId = url.searchParams.get('deckId');
  if (!deckId) {
    return NextResponse.json({ error: 'deckId required' }, { status: 400 });
  }
  const drafts = await CardDraftRepository.list(session.user.email, deckId);
  return NextResponse.json({ drafts });
}
