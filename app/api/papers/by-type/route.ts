import { NextResponse } from 'next/server';
import { listPapersByType } from '@/lib/papers/paper-queries';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import type { SessionType } from '@/lib/sessions/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const typeParam = url.searchParams.get('type');
  if (!typeParam) {
    return NextResponse.json({ error: 'Type parameter is required' }, { status: 400 });
  }

  if (!Object.values(SessionTypeEnum).includes(typeParam as SessionTypeEnum)) {
    return NextResponse.json(
      { error: 'Invalid session type', validTypes: Object.values(SessionTypeEnum) },
      { status: 400 }
    );
  }

  const type = typeParam as SessionType;
  const papers = await listPapersByType(type, 20);
  return NextResponse.json({ papers });
}
