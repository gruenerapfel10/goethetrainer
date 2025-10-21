import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { submitAnswersBulkForSession } from '@/lib/sessions/session-service';

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
    const preparedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer: answer as string | string[] | boolean,
      timeSpent: 0,
      hintsUsed: 0,
    }));

    const results = await submitAnswersBulkForSession(
      sessionId,
      authSession.user.email,
      preparedAnswers
    );

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
    const status =
      typeof (error as any)?.statusCode === 'number'
        ? (error as any).statusCode
        : 500;
    return NextResponse.json(
      { error: 'Failed to mark questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status }
    );
  }
}
