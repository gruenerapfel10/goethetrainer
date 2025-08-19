// Auth removed - no authentication needed
// import { auth } from '@/app/(auth)/auth';
// Using Firebase instead of PostgreSQL
import { getVotesByChatId, voteMessage } from '@/lib/firebase/chat-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('chatId is required', { status: 400 });
  }

  // Auth removed - no authentication needed
  const session = { user: { email: 'anonymous@example.com' } };

  const votes = await getVotesByChatId({ chatId });

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

  // Auth removed - no authentication needed
  const session = { user: { email: 'anonymous@example.com' } };

  await voteMessage({
    chatId,
    messageId,
    type: type,
  });

  return new Response('Message voted', { status: 200 });
}
