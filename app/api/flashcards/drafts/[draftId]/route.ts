import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { CardDraftRepository } from '@/lib/flashcards/drafts-repository';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const resolvedParams = await params;
  await CardDraftRepository.delete(session.user.email, resolvedParams.draftId);
  return NextResponse.json({ success: true });
}
