import { type NextRequest, NextResponse } from 'next/server';
import { getUseCasesByCategory } from '@/lib/db/dashboard'; // Import the new function
import { auth } from '@/app/(auth)/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const categoryId = searchParams.get('categoryId');

  if (!categoryId) {
    return NextResponse.json({ error: 'Missing categoryId parameter' }, { status: 400 });
  }

  try {
    const useCases = await getUseCasesByCategory(categoryId);
    // Return the fetched use cases under a 'useCases' key
    return NextResponse.json({ useCases });
  } catch (error) {
    console.error(`Failed to get use cases for category ${categoryId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get use cases';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 