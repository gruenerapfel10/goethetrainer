import { auth } from '@/app/(auth)/auth';
import type { NextRequest } from 'next/server';
import { searchChatsByTitle } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q') || '';
  const limit = Number.parseInt(searchParams.get('limit') || '20');
  const endingBefore = searchParams.get('ending_before');

  const session = await auth();

  if (!session?.user?.id) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  try {
    const result = await searchChatsByTitle({
      userId: session.user.id,
      query,
      limit,
      endingBefore,
    });

    return Response.json(result);
  } catch (error) {
    console.error('Failed to search chats:', error);
    return Response.json('Failed to search chats!', { status: 500 });
  }
}