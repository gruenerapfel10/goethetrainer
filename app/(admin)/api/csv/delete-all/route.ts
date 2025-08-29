import { type NextRequest, NextResponse } from 'next/server';
import { csvDb } from '@/lib/db/client';
import { sql } from 'drizzle-orm';
import { listCsvTables } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

export async function DELETE(req: NextRequest) {
  // Get the current user session
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get all tables in the database
    const allTables = await listCsvTables();
    
    if (!allTables.length) {
      return NextResponse.json({ 
        message: 'No tables found to delete',
        deletedCount: 0 
      });
    }
    
    // Delete each table
    const results = await Promise.all(
      allTables.map(async (table) => {
        try {
          // Delete the CSV table from the database
          await csvDb.execute(sql.raw(`DROP TABLE IF EXISTS "${table.tableName}"`));
          return { tableName: table.tableName, success: true };
        } catch (error) {
          console.error(`Error deleting table ${table.tableName}:`, error);
          return { tableName: table.tableName, success: false, error: String(error) };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    return NextResponse.json({ 
      message: `Deleted ${successCount} tables successfully${failedCount > 0 ? `, ${failedCount} tables failed` : ''}`,
      totalCount: results.length,
      successCount,
      failedCount,
      results
    });
  } catch (error) {
    console.error('Error deleting tables:', error);
    return NextResponse.json(
      { message: `Error deleting tables: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 