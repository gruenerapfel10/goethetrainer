import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { streamBufferManager } from '@/lib/ai/stream-buffer';
import { UI_MESSAGE_STREAM_HEADERS } from 'ai';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = streamBufferManager.createResumeStream(id);
  
  if (!stream) {
    return new Response(null, { status: 204 });
  }

  return new Response(stream, { headers: UI_MESSAGE_STREAM_HEADERS });
}
