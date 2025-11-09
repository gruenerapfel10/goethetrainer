import { auth } from '@/app/(auth)/auth';
import { deleteReadingListEntry } from '@/lib/db/queries';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await deleteReadingListEntry({
      userId: session.user.id,
      entryId,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete reading list entry:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete entry.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
