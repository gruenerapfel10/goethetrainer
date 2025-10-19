import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionManager } from '@/lib/sessions/session-manager';

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
    const questions = manager.getAllQuestions();

    // Log summary of generated questions
    console.log(`\n📝 Generated ${questions.length} questions for session ${sessionId}`);
    questions.forEach((q, idx) => {
      console.log(`   Q${idx + 1}: ${q.prompt} [Context: ${q.context ? 'Yes' : 'No'}]`);
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}