import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionManager } from '@/lib/sessions/session-manager';
import { getSessionConfig } from '@/lib/sessions/session-registry';
import type { SessionTypeEnum } from '@/lib/sessions/session-registry';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;
    const manager = await getSessionManager(authSession.user.email, sessionId);
    const session = manager.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get expected question count from config
    const config = getSessionConfig(session.type as SessionTypeEnum);
    let expectedCount = 0;
    if (config.fixedLayout) {
      expectedCount = config.fixedLayout.reduce((sum, type) => {
        return sum + (type === 'gap_text_multiple_choice' ? 9 : 7);
      }, 0);
    }

    // Set up SSE response
    const encoder = new TextEncoder();
    let currentCount = 0;
    let lastSentCount = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const checkInterval = setInterval(async () => {
          // Reload session to check for new questions
          const updatedManager = await getSessionManager(authSession.user.email, sessionId);
          const updatedSession = updatedManager.getSession();
          const questions = updatedSession?.data?.questions || [];
          currentCount = questions.length;

          // Send new questions since last check
          if (currentCount > lastSentCount) {
            const newQuestions = questions.slice(lastSentCount);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ questions: newQuestions, total: currentCount })}\n\n`)
            );
            lastSentCount = currentCount;
          }

          // Close when all questions generated
          if (expectedCount > 0 && currentCount >= expectedCount) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
            clearInterval(checkInterval);
            controller.close();
          }
        }, 500); // Check every 500ms
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in SSE stream:', error);
    return NextResponse.json(
      { error: 'Stream error' },
      { status: 500 }
    );
  }
}
