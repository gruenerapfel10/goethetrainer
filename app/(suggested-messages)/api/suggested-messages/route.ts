// app/api/suggested-messages/route.ts
import { NextResponse } from 'next/server';
import { getSuggestedMessagesByModelId } from '../../../../lib/db/queries';
import { defaultSuggestions } from '../../../../components/suggested-actions/defaultConfig';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modelId = searchParams.get('modelId');

  if (!modelId) {
    return NextResponse.json(
      { error: 'Model ID is required' },
      { status: 400 },
    );
  }

  try {
    // Get messages from database
    const messages = await getSuggestedMessagesByModelId(modelId);

    // If no messages in database, return default ones
    if (!messages || messages.length === 0) {
      return NextResponse.json(defaultSuggestions[modelId] || [], {
        status: 200,
      });
    }

    // Map database messages to the expected format
    const formattedMessages = messages.map((message) => ({
      title: message.title,
      label: message.label,
      action: message.action,
    }));

    return NextResponse.json(formattedMessages, { status: 200 });
  } catch (error) {
    console.error('Error fetching suggested messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggested messages' },
      { status: 500 },
    );
  }
}
