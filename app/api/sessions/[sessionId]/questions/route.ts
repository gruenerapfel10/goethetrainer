import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionQuestions } from '@/lib/sessions/session-service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await context.params;
    const questions = await getSessionQuestions(
      sessionId,
      authSession.user.email
    );

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    const status =
      typeof (error as any)?.statusCode === 'number'
        ? (error as any).statusCode
        : 500;
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status }
    );
  }
}
