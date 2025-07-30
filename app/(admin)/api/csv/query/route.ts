import { type NextRequest, NextResponse } from 'next/server';
import { csvDb } from '@/lib/db/client';
import { sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json(
        { message: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Security check - only allow SELECT queries
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select ')) {
      return NextResponse.json(
        { message: 'Only SELECT queries are allowed for security reasons' },
        { status: 403 }
      );
    }
    
    // Execute the query
    const results = await csvDb.execute(sql.raw(query));
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error executing query:', error);
    return NextResponse.json(
      { message: `Error executing query: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 