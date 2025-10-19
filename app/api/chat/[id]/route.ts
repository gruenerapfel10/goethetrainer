import { auth } from '@/app/(auth)/auth';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const chat = await getChatById({ id });
    
    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    // Check if user owns the chat or if it's public
    if (chat.userId !== session.user.id && chat.visibility !== 'public') {
      return new Response('Forbidden', { status: 403 });
    }

    const messages = await getMessagesByChatId({ id });

    return new Response(
      JSON.stringify({
        id: chat.id,
        title: chat.title,
        messages: messages || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching chat:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch chat' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}