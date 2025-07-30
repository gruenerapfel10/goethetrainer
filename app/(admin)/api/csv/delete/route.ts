import { type NextRequest, NextResponse } from 'next/server';
import { csvDb } from '@/lib/db/client';
import { sql } from 'drizzle-orm';
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

  const searchParams = req.nextUrl.searchParams;
  const tableName = searchParams.get('tableName');
  
  if (!tableName) {
    return NextResponse.json(
      { message: 'Table name is required' },
      { status: 400 }
    );
  }

  try {
    // Delete the CSV table from the database
    await csvDb.execute(sql.raw(`DROP TABLE IF EXISTS "${tableName}"`));

    return NextResponse.json({ 
      message: `Table ${tableName} deleted successfully`
    });
  } catch (error) {
    console.error(`Error deleting table ${tableName}:`, error);
    return NextResponse.json(
      { message: `Error deleting table: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}