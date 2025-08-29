import { NextResponse } from 'next/server';
import { getAllUseCaseCategories } from '@/lib/db/queries';

export const dynamic = 'force-dynamic'; // Ensure data is fetched dynamically

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Pagination parameters
  const page = Number.parseInt(searchParams.get('page') || '1');
  const limit = Number.parseInt(searchParams.get('limit') || '10');

  // Search parameters
  const searchQuery = searchParams.get('searchQuery') || undefined;
  const searchFilterParam = searchParams.get('searchFilter');
  const searchFilter: 'categories' | 'all' = 
    (searchFilterParam === 'all' || searchFilterParam === 'categories') 
      ? searchFilterParam 
      : 'categories'; // Default to 'categories'

  // Date filter parameters (placeholder for potential future implementation)
  const dateFilterParam = searchParams.get('dateFilter');
  // Add logic to parse dateFilterParam and customDateRange if needed

  try {
    const paginationOptions = { page, limit };
    const searchOptions = { query: searchQuery, filter: searchFilter };
    // Add date filter options if implemented

    const result = await getAllUseCaseCategories(
        paginationOptions, 
        searchOptions, 
        // Pass date filters here if implemented
    );

    return NextResponse.json(result); // Return the whole result object including pagination and categories

  } catch (error) {
    console.error('Failed to fetch use case categories:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
} 