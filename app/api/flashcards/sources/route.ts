import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { SourceRepository } from '@/lib/flashcards/source-documents';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sources = await SourceRepository.list(session.user.id);
  return NextResponse.json({ sources });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { type } = body;
  try {
    if (type === 'url') {
      if (!body.url) {
        return NextResponse.json({ error: 'url is required' }, { status: 400 });
      }
      const doc = await SourceRepository.createFromUrl(session.user.id, body.url, body.title);
      return NextResponse.json({ doc });
    }

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const doc = await SourceRepository.createFromText(session.user.id, {
      title: body.title ?? 'Untitled',
      content: body.content,
      origin: {
        type: type === 'upload' ? 'upload' : 'manual',
        reference: body.reference,
      },
    });
    return NextResponse.json({ doc });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create source' },
      { status: 400 }
    );
  }
}
