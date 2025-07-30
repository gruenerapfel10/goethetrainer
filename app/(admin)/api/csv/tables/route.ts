import { NextResponse } from 'next/server';
import { listCsvTables } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

export async function GET() {
  try {
    // Get the current user session
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get all tables from the database
    const allTables = await listCsvTables();
    
    if (!allTables.length) {
      return NextResponse.json({ tables: [] });
    }
    
    // Format tables for frontend display
    const tables = allTables.map(table => ({
      tableName: table.tableName,
      actualTableName: table.tableName,
      rowCount: table.rowCount,
      lastUpdated: table.lastUpdated
    }));

    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { message: `Error fetching tables: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 