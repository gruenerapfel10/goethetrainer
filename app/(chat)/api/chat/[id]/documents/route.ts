import { auth } from '@/app/(auth)/auth';
import { getDocumentsByChatId } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id: chatId } = await params;

  if (!chatId) {
    return new Response('Missing chat ID', { status: 400 });
  }

  try {
    const documents = await getDocumentsByChatId({ chatId });
    return Response.json(documents, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch chat documents:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
