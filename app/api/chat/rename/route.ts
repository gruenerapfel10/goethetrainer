import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { updateChatTitle } from '@/lib/db/queries';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { chatId, customTitle } = await req.json();

    if (!chatId) {
      return new NextResponse('Missing chatId', { status: 400 });
    }

    await updateChatTitle({
      chatId,
      customTitle,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error renaming chat:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 