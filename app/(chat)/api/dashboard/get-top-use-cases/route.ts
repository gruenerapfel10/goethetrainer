import { type NextRequest, NextResponse } from 'next/server';
import { getAllUseCaseCategories } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('dateFilter') as 'all' | 'week' | 'month' | 'year' | 'custom' || 'all';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let customDateRange;
    if (dateFilter === 'custom' && from && to) {
      customDateRange = {
        from: new Date(from),
        to: new Date(to)
      };
    }

    const { categories, totalCategories } = await getAllUseCaseCategories(
      { page: 1, limit: 100 },
      undefined,
      dateFilter,
      customDateRange
    );
    
    return NextResponse.json({
      categories,
      totalChats: totalCategories
    });
  } catch (error) {
    console.error('Failed to fetch use case categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch use case categories' },
      { status: 500 }
    );
  }
} 