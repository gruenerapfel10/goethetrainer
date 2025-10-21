import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionManager } from '@/lib/sessions/session-manager';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { answers } = await request.json();
    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { error: 'Invalid answers format' },
        { status: 400 }
      );
    }

    const { sessionId } = await context.params;
    const manager = await getSessionManager(authSession.user.email, sessionId);

    const preparedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer: answer as string | string[] | boolean,
      timeSpent: 0,
      hintsUsed: 0,
    }));

    const results = await manager.submitAnswersBulk(preparedAnswers);

    const totalQuestions = results.length;
    const correctAnswers = results.filter(r => r.isCorrect).length;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const maxScore = results.reduce((sum, r) => sum + r.maxScore, 0);
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    return NextResponse.json({
      results,
      summary: {
        totalQuestions,
        correctAnswers,
        incorrectAnswers: totalQuestions - correctAnswers,
        totalScore,
        maxScore,
        percentage: Math.round(percentage * 10) / 10,
      },
    });
  } catch (error) {
    console.error('Error marking questions:', error);
    return NextResponse.json(
      { error: 'Failed to mark questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
