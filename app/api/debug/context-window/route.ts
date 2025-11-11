import { auth } from '@/app/(auth)/auth';
import { getChatContext } from '@/lib/ai/chat-manager';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Only allow in development or for admin users
    if (process.env.NODE_ENV !== 'development' && !session.user.isAdmin) {
      return new Response('Debug endpoints only available in development', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return new Response('Missing chatId parameter', { status: 400 });
    }

    // Get chat context and debug info
    const chatContext = await getChatContext(chatId);
    // chatContext.enableDebugMode(); // Method doesn't exist yet
    
    // Trigger context calculation by getting messages
    await chatContext.getMessages();
    
    // Get debug information
    // const debugInfo = chatContext.getContextWindowDebugInfo(); // Method doesn't exist yet
    const debugInfo = null;

    if (!debugInfo) {
      return new Response(JSON.stringify({ 
        error: 'No debug information available',
        totalMessages: 0,
        includedMessages: 0,
        excludedMessages: 0,
        totalTokens: 0,
        contextWindow: 150000,
        tokenUtilization: 0,
        messageIds: [],
        maxOutputTokens: 0
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(debugInfo), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in context-window debug endpoint:', error);
    return new Response('Internal server error', { status: 500 });
  }
}