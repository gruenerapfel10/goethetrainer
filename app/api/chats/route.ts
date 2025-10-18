import { auth } from '@/app/(auth)/auth';
import { getChatsByUser } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const chats = await getChatsByUser({ userId: session.user.id });
    
    const chatItems = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
    }));

    return new Response(JSON.stringify(chatItems), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch chats' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
