import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionById, saveSession } from '@/lib/sessions/queries';
import { QuestionManager } from '@/lib/sessions/question-manager';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;
    const { questionId, answer, timeSpent, hintsUsed } = await request.json();

    // Get the session
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create question manager and submit answer
    const questionManager = new QuestionManager(session.data?.questions || []);
    const result = await questionManager.submitAnswer(questionId, answer, timeSpent, hintsUsed);

    // Update session data with current stats
    const userAnswers = questionManager.getUserAnswers();
    const questionResults = questionManager.getQuestionResults();
    const scoreStats = questionManager.getScoreStats();

    session.data = {
      ...session.data,
      questionsAnswered: userAnswers.length,
      currentScore: scoreStats.currentScore,
      maxPossibleScore: scoreStats.maxPossibleScore,
      lastAnsweredQuestion: questionId,
      answers: userAnswers,
      results: questionResults.map(r => ({
        questionId: r.questionId,
        score: r.score,
        maxScore: r.maxScore,
        isCorrect: r.isCorrect,
        feedback: r.feedback
      }))
    };

    await saveSession(session);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}