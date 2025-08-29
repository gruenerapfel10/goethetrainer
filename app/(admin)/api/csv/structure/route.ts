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
  
  if (!tableName) {
    return NextResponse.json(
      { message: 'Table name is required' },
      { status: 400 }
    );
  }

  try {
    // Get table structure
    const columnsResult = await csvDb.execute(sql.raw(`
      SELECT 
        column_name AS "columnName", 
        data_type AS "dataType"
      FROM 
        information_schema.columns
      WHERE 
        table_name = '${tableName}'
      ORDER BY 
        ordinal_position
    `));

    const columns = columnsResult.map((col: Record<string, unknown>) => ({
      columnName: col.columnName as string,
      dataType: col.dataType as string
    }));

    return NextResponse.json({ 
      tableName, 
      columns 
    });
  } catch (error) {
    console.error(`Error fetching structure for table ${tableName}:`, error);
    return NextResponse.json(
      { message: `Error fetching table structure: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 