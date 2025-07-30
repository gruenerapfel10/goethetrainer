// app/api/admin/suggested-messages/route.ts
import { NextResponse } from 'next/server';

import { auth } from '../../../../(auth)/auth';
import {
  deleteSuggestedMessage,
  saveSuggestedMessage,
} from '../../../../../lib/db/queries';

export async function POST(request: Request) {
  // Check if user is authenticated and is an admin
  const session = await auth();
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { modelId, position, title, label, action } = await request.json();

    // Validate required fields
    if (!modelId || !position) {
      return NextResponse.json(
        { error: 'Model ID and position are required' },
        { status: 400 },
      );
    }

    // If all fields are empty, delete the message
    if (!title && !label && !action) {
      await deleteSuggestedMessage({ modelId, position });
      return NextResponse.json(
        { success: true, message: 'Suggestion deleted' },
        { status: 200 },
      );
    }

    // Validate that all required fields are provided
    if (!title || !label || !action) {
      return NextResponse.json(
        { error: 'Title, label, and action are required' },
        { status: 400 },
      );
    }

    // Save the suggested message
    await saveSuggestedMessage({
      modelId,
      title,
      label,
      action,
      position,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error saving suggested message:', error);
    return NextResponse.json(
      { error: 'Failed to save suggested message' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  // Check if user is authenticated and is an admin
  const session = await auth();
  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const modelId = searchParams.get('modelId');
  const position = searchParams.get('position');

  if (!modelId || !position) {
    return NextResponse.json(
      { error: 'Model ID and position are required' },
      { status: 400 },
    );
  }

  try {
    await deleteSuggestedMessage({ modelId, position });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting suggested message:', error);
    return NextResponse.json(
      { error: 'Failed to delete suggested message' },
      { status: 500 },
    );
  }
}
