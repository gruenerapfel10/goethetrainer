import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { DeckRepository } from '@/lib/flashcards/repository/memory-repo';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const validScheduler = typeof body.schedulerId === 'string';
  const validPolicy = typeof body.feedbackPolicyId === 'string';
  if (!validScheduler && !validPolicy) {
    return NextResponse.json({ error: 'schedulerId or feedbackPolicyId required' }, { status: 400 });
  }
  try {
    const resolvedParams = await params;
    const deck = await DeckRepository.updateSettings(session.user.email, resolvedParams.deckId, {
      schedulerId: validScheduler ? body.schedulerId : undefined,
      feedbackPolicyId: validPolicy ? body.feedbackPolicyId : undefined,
    });
    return NextResponse.json({ deck });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 400 }
    );
  }
}
