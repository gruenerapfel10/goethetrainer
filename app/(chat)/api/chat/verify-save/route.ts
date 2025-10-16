import { NextResponse } from 'next/server';
import { getMessagesByChatId } from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  
  if (!chatId) {
    return NextResponse.json({ error: 'chatId required' }, { status: 400 });
  }
  
  try {
    const messages = await getMessagesByChatId({ id: chatId });
    
    // Check for tool content in messages
    const toolMessages = messages.filter(msg => {
      if (Array.isArray(msg.parts)) {
        return msg.parts.some((part: any) => 
          part.type?.startsWith('tool-') || 
          part.type === 'tool-call' || 
          part.type === 'tool-result'
        );
      }
      return false;
    });
    
    return NextResponse.json({
      chatId,
      totalMessages: messages.length,
      messagesWithTools: toolMessages.length,
      toolDetails: toolMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        partsCount: Array.isArray(msg.parts) ? msg.parts.length : 0,
        toolParts: Array.isArray(msg.parts) ? 
          msg.parts.filter((p: any) => p.type?.includes('tool')).map((p: any) => ({
            type: p.type,
            hasInput: !!p.input,
            hasOutput: !!p.output,
            state: p.state
          })) : []
      }))
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}