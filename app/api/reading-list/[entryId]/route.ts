import { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  deleteReadingListEntry,
  updateReadingListEntry,
} from '@/lib/db/queries';

async function ensureSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return session.user.id;
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ entryId: string }> }
) {
  const { params } = context;
  const { entryId } = await params;
  try {
    const userId = await ensureSession();
    await deleteReadingListEntry({
      userId,
      entryId,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Failed to delete reading list entry:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete entry.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ entryId: string }> }
) {
  const { params } = context;
  const { entryId } = await params;
  try {
    const userId = await ensureSession();
    const payload = await request.json();
    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    const translation =
      typeof payload?.translation === 'string'
        ? payload.translation.trim()
        : '';

    if (!text || !translation) {
      return new Response('Text and translation are required.', {
        status: 400,
      });
    }

    const updated = await updateReadingListEntry({
      userId,
      entryId,
      text,
      translation,
    });
    if (!updated) {
      return new Response('Entry not found.', { status: 404 });
    }

    return new Response(
      JSON.stringify({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Failed to update reading list entry:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update entry.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
