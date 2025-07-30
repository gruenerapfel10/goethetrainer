import { NextResponse } from 'next/server';
import { getUseCaseAnalyticsData } from '@/lib/db/queries';
// import { auth } from '@/lib/auth'; // Assuming auth setup exists

export const dynamic = 'force-dynamic'; // Ensure fresh data

export async function GET(request: Request) {
  try {
    // --- Authentication/Authorization --- 
    // Ensure only authorized users (e.g., admins) can access this
    // const session = await auth();
    // TODO: Implement proper admin check based on your user schema/roles
    // if (!session?.user?.isAdmin) { 
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }
    // --- Fetch Data ---
    const analyticsData = await getUseCaseAnalyticsData();

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('[API /use-cases/analytics] Failed to fetch analytics data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch analytics data', details: errorMessage }, { status: 500 });
  }
} 