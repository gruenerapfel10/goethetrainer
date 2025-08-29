import { NextResponse } from 'next/server';
import { getTimeSavedPerCategory } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth'; // Corrected auth import path

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

/**
 * API route to get the total time saved (in minutes) for each use case category.
 */
export async function GET() {
  try {
    // Optional: Add authentication/authorization checks if needed
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // You might want to add role checks here if only admins can see this

    const timeSavedData = await getTimeSavedPerCategory();

    return NextResponse.json(timeSavedData);

  } catch (error) {
    console.error('Error fetching total time saved per category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
