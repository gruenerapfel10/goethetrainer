import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { CardDraftRepository } from '@/lib/flashcards/drafts-repository';

export async function DELETE(
  _request: Request,
  { params }: { params: { draftId: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await CardDraftRepository.delete(session.user.email, params.draftId);
  return NextResponse.json({ success: true });
}
