import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { adminDb } from '@/lib/firebase/admin';
import { getSessionById } from '@/lib/sessions/queries';

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const authSession = await auth();
  if (!authSession?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (session.userId !== authSession.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendEvent = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const unsubscribe = adminDb
        .collection('sessions')
        .doc(sessionId)
        .onSnapshot(
          snapshot => {
            const data = snapshot.data();
            if (!data) {
              return;
            }
            const generation = data?.data?.generation ?? null;
            const questionsLength = Array.isArray(data?.data?.questions)
              ? data.data.questions.length
              : 0;
            const updatedAt = data?.metadata?.lastUpdatedAt ?? new Date().toISOString();
            sendEvent({ generation, questionsLength, updatedAt });
          },
          error => {
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`
              )
            );
            controller.close();
          }
        );

      const close = () => {
        unsubscribe();
        controller.close();
      };

      request.signal.addEventListener('abort', close);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
