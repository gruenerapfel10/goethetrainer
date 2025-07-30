// csv-query.ts
//
// THE ORCHESTRATOR.
// This file connects the user request to the text-to-sql brain and the database executor.
// It is now simple, stateless, and free of complex validation logic.

import { tool } from 'ai';
import { z } from 'zod';
import { executeCsvQuery } from '@/lib/db/queries';
import { generateSqlQuery, } from '@/lib/text-to-sql';

/**
 * A simple helper to get just the column names from a table.
 * This replaces the old, flawed getTableStructure function.
 */
const getColumnNames = async (tableName: string): Promise<string[]> => {
  try {
    // We get one row and extract its keys. This is fast and sufficient.
    const sampleQuery = `SELECT * FROM "${tableName}" LIMIT 1`;
    const sampleData = await executeCsvQuery(sampleQuery);
    if (!sampleData || sampleData.length === 0) return [];
    return Object.keys(sampleData[0]);
  } catch (error) {
    console.error(`Error getting column names for table ${tableName}:`, error);
    return [];
  }
};

export const csvQuery = tool({
  description: 'Execute a natural language query against a CSV file by converting it to SQL.',
  parameters: z.object({
    query: z.string().describe('The natural language query to analyze the CSV data.'),
    tableName: z.string().describe('The name of the table to query.'),
  }),
  execute: async ({ query, tableName }) => {
    console.log('=== CSV QUERY TOOL CALLED ===');
    const startTime = Date.now();

    try {
      // 1. Get column names. No types, no complex logic.
      const columnNames = await getColumnNames(tableName);
      if (columnNames.length === 0) {
        throw new Error(`Could not determine columns for table "${tableName}".`);
      }
      console.log(`Found ${columnNames.length} columns for table "${tableName}".`);

      // 2. Generate SQL. The "brain" (text-to-sql) does all the heavy lifting.
      const sqlResult = await generateSqlQuery(query, tableName, columnNames);
      if (sqlResult.error) {
        throw new Error(`SQL Generation Failed: ${sqlResult.error}`);
      }
      console.log('Generated SQL:', sqlResult.query);

      // 4. Execute the query.
      console.log('Executing SQL...');
      const result = await executeCsvQuery(sqlResult.query);
      console.log(`Query successful. ${result.length} rows returned.`);

      console.log(`=== CSV QUERY COMPLETE (${Date.now() - startTime}ms) ===`);
      return {
        success: true,
        query: sqlResult.query,
        explanation: sqlResult.explanation,
        result: result,
      };

    } catch (error) {
      console.error(`Critical error in csvQuery tool:`, error);
      console.log(`=== CSV QUERY FAILED (${Date.now() - startTime}ms) ===`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred.',
      };
    }
  },
});
