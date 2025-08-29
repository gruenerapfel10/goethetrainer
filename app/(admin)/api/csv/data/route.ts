import { type NextRequest, NextResponse } from 'next/server';
import { csvDb } from '@/lib/db/client';
import { sql } from 'drizzle-orm';
import { auth } from '@/app/(auth)/auth';

export async function GET(req: NextRequest) {
  // Get the current user session
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const tableName = searchParams.get('tableName');
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');
  
  if (!tableName) {
    return NextResponse.json(
      { message: 'Table name is required' },
      { status: 400 }
    );
  }

  // Set defaults or parse parameters
  const limit = limitParam ? Number.parseInt(limitParam) : 100;
  const offset = offsetParam ? Number.parseInt(offsetParam) : 0;

  try {
    // Get table data with pagination
    const rows = await csvDb.execute(sql.raw(`
      SELECT * FROM "${tableName}"
      LIMIT ${limit}
      OFFSET ${offset}
    `));

    return NextResponse.json({ 
      tableName, 
      rows,
      meta: {
        limit,
        offset
      }
    });
  } catch (error) {
    console.error(`Error fetching data for table ${tableName}:`, error);
    return NextResponse.json(
      { message: `Error fetching table data: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 