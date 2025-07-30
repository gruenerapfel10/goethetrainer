import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getDefaultPrompt } from '@/lib/ai/prompts';

// Check admin status
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Check if user is admin
  const isAdmin = session.user.isAdmin;
  if (!isAdmin) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return null; // No error
}

export async function GET(request: Request) {
  // Check admin status
  const authError = await checkAdmin();
  if (authError) return authError;

  try {
    // Get assistant id from the query string
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('assistantId');

    if (!assistantId) {
      return NextResponse.json(
        { error: 'assistantId is required' },
        { status: 400 },
      );
    }

    const promptText = getDefaultPrompt(assistantId);

    return NextResponse.json({ promptText });
  } catch (error) {
    console.error('Error fetching default prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch default prompt' },
      { status: 500 },
    );
  }
}
