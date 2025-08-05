// Auth removed - no authentication needed
// import { auth } from '@/app/(auth)/auth';

import { streamAgent } from './route.service';
// Database removed - using stub functions
// import { deleteChatById, getChatById } from '../../../../lib/db/queries';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    // Pass the json data to streamAgent
    return streamAgent(json);
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  // Auth removed - no authentication needed
  // const session = await auth();
  // if (!session || !session.user) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    // Database removed - just return success
    // const chat = await getChatById({ id });
    // if (!chat || chat.userId !== session.user.id) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    // await deleteChatById({ id });
    console.log('Database operation disabled - deleteChatById for id:', id);
    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
