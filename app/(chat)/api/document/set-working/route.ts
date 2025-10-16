import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/client';
import { document } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('unauthorized', { status: 401 });
  }

  const { documentId, version } = await request.json();

  if (!documentId || !version) {
    return new Response('missing required fields', { status: 400 });
  }

  const docs = await db
    .select()
    .from(document)
    .where(eq(document.id, documentId));

  if (docs.length === 0) {
    return new Response('document not found', { status: 404 });
  }

  if (docs[0].userId !== session.user.id) {
    return new Response('forbidden', { status: 403 });
  }

  await db
    .update(document)
    .set({ isWorkingVersion: false })
    .where(eq(document.id, documentId));

  await db
    .update(document)
    .set({ isWorkingVersion: true })
    .where(and(
      eq(document.id, documentId),
      eq(document.version, version)
    ));

  return Response.json({ success: true }, { status: 200 });
}
