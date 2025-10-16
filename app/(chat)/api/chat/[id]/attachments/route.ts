import { getAttachments } from '@/lib/ai/chat-manager';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;
    const attachments = await getAttachments(chatId);
    
    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('Failed to fetch attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}