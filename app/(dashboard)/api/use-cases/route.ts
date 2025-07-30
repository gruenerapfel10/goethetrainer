import { type NextRequest, NextResponse } from 'next/server';
import { getUseCasesByCategory } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');
  const page = Number.parseInt(searchParams.get('page') || '1');
  const limit = Number.parseInt(searchParams.get('limit') || '5');
  const searchQuery = searchParams.get('searchQuery') || undefined;

  if (!categoryId) {
    return NextResponse.json(
      { error: 'Category ID query parameter is required' },
      { status: 400 },
    );
  }

  try {
    const { useCases, totalPages, currentPage, totalUseCases } =
      await getUseCasesByCategory(categoryId, { page, limit }, searchQuery);
    return NextResponse.json({
      useCases,
      totalPages,
      currentPage,
      totalUseCases,
    });
  } catch (error) {
    console.error(
      `[/api/use-cases] Error fetching use cases for category ${categoryId}:`,
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: 'Failed to fetch use cases' },
      { status: 500 },
    );
  }
}
