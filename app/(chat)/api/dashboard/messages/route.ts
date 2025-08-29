import { type NextRequest, NextResponse } from 'next/server';
import {
  getMessagesByUseCaseId,
  getPaginatedMessagesByChatId,
} from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const useCaseId = searchParams.get('useCaseId');
  const chatId = searchParams.get('chatId');

  if (!useCaseId && !chatId) {
    return NextResponse.json(
      { error: 'Either useCaseId or chatId query parameter is required' },
      { status: 400 },
    );
  }

  try {
    let messages: any[] = [];
    let identifierType: string;
    let identifierValue: string;

    if (chatId) {
      identifierType = 'chat';
      identifierValue = chatId;
      const result = await getPaginatedMessagesByChatId(chatId, {
        page: 1,
        limit: 1000,
      });
      messages = result.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts,
        modelId: msg.modelId,
        inputTokens: msg.inputTokens,
        outputTokens: msg.outputTokens,
        createdAt: msg.createdAt.toISOString(),
        userEmail: msg.userEmail,
      }));
    } else if (useCaseId) {
      identifierType = 'use case';
      identifierValue = useCaseId;
      const useCaseMessages = await getMessagesByUseCaseId({ useCaseId });
      messages = useCaseMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts,
        modelId: msg.modelId,
        inputTokens: msg.inputTokens,
        outputTokens: msg.outputTokens,
        createdAt: msg.createdAt.toISOString(),
        userEmail: msg.userEmail,
      }));
    } else {
      throw new Error('Missing required identifier.');
    }

    return NextResponse.json({ messages });
  } catch (error) {
    const identifier = chatId || useCaseId || 'unknown';
    const idType = chatId ? 'chat' : 'use case';
    console.error(
      `[/api/messages] Error fetching messages for ${idType} ${identifier}:`,
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: `Failed to fetch messages for ${idType}` },
      { status: 500 },
    );
  }
}
