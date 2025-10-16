import { auth } from '@/app/(auth)/auth';
import { getVotesByChatId, voteMessage } from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('chatId is required', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const votes = await getVotesByChatId({ id: chatId });

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  const {
    chatId,
    messageId,
    type,
  }: { chatId: string; messageId: string; type: 'up' | 'down' } =
    await request.json();

  if (!chatId || !messageId || !type) {
    return new Response('messageId and type are required', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await voteMessage({
      chatId,
      messageId,
      type: type,
    });

    return new Response('Message voted', { status: 200 });
  } catch (error: any) {
    // Handle foreign key constraint violation (message not found)
    if (error?.code === '23503' && error?.constraint_name === 'Vote_messageId_Message_id_fk') {
      return new Response(JSON.stringify({
        error: 'Message not found. Please wait for the message to complete before voting.',
        code: 'MESSAGE_NOT_FOUND'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Re-throw other errors
    throw error;
  }
}
