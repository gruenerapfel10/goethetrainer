import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { toggleChatPinned } from '@/lib/db/queries';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { chatId, isPinned } = await req.json();

    if (!chatId) {
      return new NextResponse('Missing chatId', { status: 400 });
    }

    await toggleChatPinned({
      chatId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating chat pin status:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 