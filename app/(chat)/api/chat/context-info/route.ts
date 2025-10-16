import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getChatContext } from '@/lib/ai/chat-manager';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get('chatId');
    const contextWindow = searchParams.get('contextWindow');

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const chatContext = await getChatContext(chatId);
    
    // Get the actual messages that would be sent to AI (matches route.ts logic)
    const contextMessages = await chatContext.getMessages();
    const messageIds = contextMessages.map(m => m.id);
    
    const contextInfo = chatContext.getContextInfo();
    
    // Return the actual message IDs that are in context for AI
    return NextResponse.json({
      messageIds: messageIds,
      totalTokens: contextInfo?.totalTokens || 0,
      maxTokens: contextInfo?.maxOutputTokens || parseInt(contextWindow || '150000')
    });
  } catch (error) {
    console.error('Error getting context info:', error);
    return NextResponse.json(
      { error: 'Failed to get context info' },
      { status: 500 }
    );
  }
}