import { NextResponse } from 'next/server';
import { getUserUsageOverview } from '@/lib/db/dashboard';

export async function GET(request: Request) {
  try {
    const userUsage = await getUserUsageOverview();
    return NextResponse.json(userUsage);
  } catch (error) {
    console.error('Failed to fetch user usage:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
