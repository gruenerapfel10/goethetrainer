import { NextRequest } from 'next/server';

// Lightweight SSE stream to satisfy the EventSource listener on the client.
// We just emit periodic keep-alive "ping" events; the client will refetch the
// session snapshot on each message.
export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Immediately send a first ping so the client refreshes once.
      controller.enqueue(encoder.encode(`event: ping\ndata: ${sessionId}\n\n`));

      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: ${sessionId}\n\n`));
      }, 5000);

      const abort = () => {
        clearInterval(interval);
        controller.close();
      };

      request.signal.addEventListener('abort', abort);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
