import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

export async function POST(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const authSession = await auth();

  if (!authSession?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await context.params;

  return NextResponse.json(
    {
      error:
        'Bulk marking endpoint has been removed. Persist answers via /update and call /complete to grade the session.',
    },
    { status: 410 }
  );
}
