import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSessionManager } from '@/lib/sessions/session-manager';
import { markQuestions } from '@/lib/sessions/questions/question-marker';
import { UserAnswer, Question } from '@/lib/sessions/questions/question-types';
import { AnswerType } from '@/lib/sessions/questions/question-types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  console.log('🟢 [API] Mark endpoint called');
  try {
    const authSession = await auth();
    console.log('🟢 [API] Auth session:', authSession?.user?.email);
    if (!authSession?.user?.email) {
      console.log('🔴 [API] Unauthorized - no user email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;
    console.log('🟢 [API] Session ID:', sessionId);

    const body = await request.json();
    console.log('🟢 [API] Request body:', body);

    const { answers } = body; // answers is Record<string, string> (questionId -> optionId)
    console.log('🟢 [API] Answers:', answers);

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { error: 'Invalid answers format' },
        { status: 400 }
      );
    }

    // Get the questions from the session
    console.log('🟢 [API] Getting session manager...');
    const manager = await getSessionManager(authSession.user.email, sessionId);
    console.log('🟢 [API] Getting questions...');
    const questions = manager.getAllQuestions();
    console.log('🟢 [API] Got questions:', questions.length);

    console.log(`\n🔍 Marking ${Object.keys(answers).length} answers for session ${sessionId}`);

    // Convert questions to proper format with answerType
    const questionsWithType: Question[] = questions.map(q => ({
      ...q,
      answerType: AnswerType.GAP_TEXT_MULTIPLE_CHOICE,
      points: q.points || 10,
    }));

    // Convert answers to UserAnswer format
    const userAnswers: UserAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer: answer as string,
      timeSpent: 0, // TODO: Track actual time spent
      attempts: 1,
      hintsUsed: 0,
      timestamp: new Date(),
    }));

    // Mark all questions
    const results = await markQuestions(questionsWithType, userAnswers);

    // Calculate summary statistics
    const totalQuestions = results.length;
    const correctAnswers = results.filter(r => r.isCorrect).length;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const maxScore = results.reduce((sum, r) => sum + r.maxScore, 0);
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    console.log(`✅ Marking complete: ${correctAnswers}/${totalQuestions} correct (${percentage.toFixed(1)}%)`);
    console.log(`📊 Score: ${totalScore}/${maxScore} points`);

    // Return detailed results
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
