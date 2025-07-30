import { NextResponse } from 'next/server';
import { auth } from '../../../../(auth)/auth';
import { defaultSuggestions } from '../../../../../components/suggested-actions/defaultConfig';
import { saveSuggestedMessage } from '../../../../../lib/db/queries';

export async function POST(request: Request) {
  // Check if user is authenticated and is an admin
  const session = await auth();
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { modelId } = await request.json();

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 },
      );
    }

    // Get default suggestions for the specified model
    const suggestions = defaultSuggestions[modelId];

    if (!suggestions || suggestions.length === 0) {
      return NextResponse.json(
        { error: `No default suggestions found for model ${modelId}` },
        { status: 404 },
      );
    }

    // Save each suggestion
    for (let i = 0; i < suggestions.length; i++) {
      const position = String(i + 1);
      await saveSuggestedMessage({
        modelId,
        position,
        title: suggestions[i].title,
        label: suggestions[i].label,
        action: suggestions[i].action,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Initialized ${suggestions.length} default suggestions for ${modelId}`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error initializing suggested messages:', error);
    return NextResponse.json(
      { error: 'Failed to initialize suggested messages' },
      { status: 500 },
    );
  }
}
