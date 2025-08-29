import { NextResponse } from 'next/server';
import { getFlaggedMessages } from '@/lib/db/dashboard';

export async function GET() {
  try {
    const flaggedMessages = await getFlaggedMessages();

    return NextResponse.json(flaggedMessages);
  } catch (error) {
    console.error('Failed to fetch flagged messages:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
