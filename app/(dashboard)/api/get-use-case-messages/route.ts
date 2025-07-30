import { NextResponse } from 'next/server';
import { getMessagesByUseCaseId } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const useCaseId = searchParams.get('useCaseId');

    if (!useCaseId) {
      return NextResponse.json(
        { error: 'useCaseId is required' },
        { status: 400 }
      );
    }

    const messages = await getMessagesByUseCaseId({ useCaseId });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Failed to fetch use case messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch use case messages' },
      { status: 500 }
    );
  }
} 