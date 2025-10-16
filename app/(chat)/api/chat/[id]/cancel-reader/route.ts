import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { streamBufferManager } from '@/lib/ai/stream-buffer';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  streamBufferManager.cancelReaderForChat(id);
  
  return new Response(null, { status: 204 });
}
