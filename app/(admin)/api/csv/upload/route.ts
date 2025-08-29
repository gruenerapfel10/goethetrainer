import { type NextRequest, NextResponse } from 'next/server';
import { csvDb } from '@/lib/db/client';
import { parse } from 'papaparse';
import { sql } from 'drizzle-orm';
import { auth } from '@/app/(auth)/auth';

interface CSVRow {
  [key: string]: string;
}

interface CSVFile {
  fileName: string;
  content: string;
  tableName: string;
  parseResult: {
    data: CSVRow[];
    errors: any[];
    meta: any;
  };
  columns: string[];
  columnTypes: Record<string, string>;
}

interface CSVGroup {
  tableName: string;
  files: CSVFile[];
  columns: string[];
  columnTypes: Record<string, string>;
}

// Increased batch size for better performance
const BATCH_SIZE = 5000;

// Enhanced type patterns with better range checking
const PG_TYPE_PATTERNS = {
  integer: /^-?\d+$/,
  numeric: /^-?\d*\.?\d+$/,
  timestamp: /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/
};

// PostgreSQL type limits
const PG_INTEGER_MIN = -2147483648;
const PG_INTEGER_MAX = 2147483647;
const PG_BIGINT_MIN = -9223372036854775808n;
const PG_BIGINT_MAX = 9223372036854775807n;

function detectColumnType(values: string[]): string {
  let type = 'text';
  let numericCount = 0;
  let integerCount = 0;
  let bigintCount = 0;
  let timestampCount = 0;
  let nonNullCount = 0;

  for (const value of values) {
    if (value === '' || value === null || value === undefined) {
      continue;
    }

    nonNullCount++;

    if (PG_TYPE_PATTERNS.timestamp.test(value)) {
      timestampCount++;
    } else if (PG_TYPE_PATTERNS.integer.test(value)) {
      const numValue = Number(value);
      if (!Number.isNaN(numValue)) {
        numericCount++;
        if (Number.isInteger(numValue)) {
          // Check if it fits in PostgreSQL integer range
          if (numValue >= PG_INTEGER_MIN && numValue <= PG_INTEGER_MAX) {
            integerCount++;
          } else {
            // Too big for integer, needs bigint
            bigintCount++;
          }
        }
      }
    } else if (PG_TYPE_PATTERNS.numeric.test(value)) {
      const numValue = Number(value);
      if (!Number.isNaN(numValue)) {
        numericCount++;
      }
    }
  }

  // Determine best type based on analysis
  if (nonNullCount > 0) {
    if (timestampCount === nonNullCount) {
      type = 'timestamp';
    } else if (integerCount === nonNullCount) {
      type = 'integer';
    } else if (bigintCount > 0 && (integerCount + bigintCount) === nonNullCount) {
      // If we have any bigint values, use bigint for the whole column
      type = 'bigint';
    } else if (numericCount === nonNullCount) {
      type = 'numeric';
    }
  }

  return type;
}

export async function POST(req: NextRequest) {
  try {
    // Get the current user session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll('file') as File[];
    const tableNames = formData.getAll('tableName') as string[];

    if (files.length === 0 || tableNames.length === 0 || files.length !== tableNames.length) {
      return NextResponse.json(
        { message: 'Files and table names are required and must match in count' },
        { status: 400 }
      );
    }

    // Process each file to determine their structure
    const processedFiles: CSVFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalTableName = tableNames[i];

      // Validate and clean table name
      if (!/^[a-z][a-z0-9_]*$/.test(originalTableName)) {
        return NextResponse.json(
          { message: `Invalid table name "${originalTableName}". Use only lowercase letters, numbers, and underscores. Must start with a letter.` },
          { status: 400 }
        );
      }

      // Use the original table name directly (avoid duplication)
      const tableName = originalTableName;

      // Read the file content
      const fileContent = await file.text();

      // Parse CSV
      const parseResult = parse<CSVRow>(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          return header
          .toLowerCase()
          .trim()
          .replace(/[\s\W]+/g, '_')
          .replace(/^(\d)/, '_$1')
          .replace(/^_+|_+$/g, '')
          .substring(0, 63);
        }
      });

      if (parseResult.errors.length > 0) {
        return NextResponse.json(
          { message: `CSV parsing error in file "${file.name}": ${parseResult.errors[0].message}` },
          { status: 400 }
        );
      }

      if (parseResult.data.length === 0 || Object.keys(parseResult.data[0]).length === 0) {
        return NextResponse.json(
          { message: `CSV file "${file.name}" is empty or has no valid columns` },
          { status: 400 }
        );
      }

      // Get column names
      const columns = Object.keys(parseResult.data[0]);

      // Enhanced type inference with larger sample and range checking
      const sampleSize = Math.min(100, parseResult.data.length); // Increased sample size
      const sampleData = parseResult.data.slice(0, sampleSize);

      const columnTypes: Record<string, string> = {};

      for (const column of columns) {
        const columnValues = sampleData.map(row => row[column]).filter(val =>
          val !== '' && val !== null && val !== undefined
        );

        columnTypes[column] = detectColumnType(columnValues);
      }

      processedFiles.push({
        fileName: file.name,
        content: fileContent,
        tableName,
        parseResult,
        columns,
        columnTypes
      });
    }

    // Group files by identical column structure
    const fileGroups: CSVGroup[] = [];

    for (const file of processedFiles) {
      const signature = file.columns.map(col => `${col}:${file.columnTypes[col]}`).sort().join('|');
      let matchFound = false;

      for (const group of fileGroups) {
        const groupSignature = group.columns.map(col => `${col}:${group.columnTypes[col]}`).sort().join('|');

        if (signature === groupSignature) {
          group.files.push(file);
          matchFound = true;
          break;
        }
      }

      if (!matchFound) {
        fileGroups.push({
          tableName: file.tableName,
          files: [file],
          columns: file.columns,
          columnTypes: file.columnTypes
        });
      }
    }

    // Create tables and insert data for each group
    const results = [];

    for (const group of fileGroups) {
      const tableName = group.tableName;
      const columns = group.columns;
      const columnTypes = group.columnTypes;

      // Drop table if exists (with proper error handling)
      try {
        await csvDb.execute(sql.raw(`DROP TABLE IF EXISTS "${tableName}"`));
      } catch (error) {
        console.log(`Notice: Table "${tableName}" didn't exist`);
      }

      // Create table with proper column types
      let createTableQuery = `CREATE TABLE "${tableName}" (`;
      const columnDefinitions = columns.map(column => `"${column}" ${columnTypes[column]}`);
      createTableQuery += `${columnDefinitions.join(', ')})`;

      console.log(`Creating table with query: ${createTableQuery}`);
      await csvDb.execute(sql.raw(createTableQuery));

      // Insert data with improved type handling
      let totalRows = 0;

      for (const file of group.files) {
        const data = file.parseResult.data;

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);

          if (batch.length === 0) continue;

          // Process in smaller sub-batches for memory efficiency
          for (let j = 0; j < batch.length; j += 500) {
            const batchSlice = batch.slice(j, j + 500);
            const valuesList = [];

            for (const row of batchSlice) {
              const rowValues = [];

              for (const column of columns) {
                const value = row[column];

                if (value === '' || value === null || value === undefined) {
                  rowValues.push('NULL');
                  continue;
                }

                const columnType = columnTypes[column];

                if (columnType === 'integer' || columnType === 'bigint') {
                  const cleanValue = value.toString().replace(/,/g, '');
                  const numValue = Number(cleanValue);
                  if (Number.isNaN(numValue) || !Number.isInteger(numValue)) {
                    rowValues.push('NULL');
                  } else {
                    // Validate range for integer type
                    if (columnType === 'integer' && (numValue < PG_INTEGER_MIN || numValue > PG_INTEGER_MAX)) {
                      console.warn(`Value ${numValue} out of range for integer, inserting as NULL`);
                      rowValues.push('NULL');
                    } else {
                      rowValues.push(numValue.toString());
                    }
                  }
                } else if (columnType === 'numeric') {
                  const cleanValue = value.toString().replace(/,/g, '');
                  const numValue = Number(cleanValue);
                  if (Number.isNaN(numValue)) {
                    rowValues.push('NULL');
                  } else {
                    rowValues.push(numValue.toString());
                  }
                } else if (columnType === 'timestamp') {
                  rowValues.push(`'${value.toString().replace(/'/g, "''")}'`);
                } else {
                  // text and other types
                  rowValues.push(`'${value.toString().replace(/'/g, "''")}'`);
                }
              }

              valuesList.push(`(${rowValues.join(',')})`);
            }

            if (valuesList.length > 0) {
              const insertQuery = `
                INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(',')})
                VALUES ${valuesList.join(',')}
              `;

              await csvDb.execute(sql.raw(insertQuery));
            }
          }

          totalRows += batch.length;
        }
      }

      results.push({
        tableName: tableName,
        actualTableName: tableName,
        rowCount: totalRows,
        sourceFiles: group.files.map(f => f.fileName),
        merged: group.files.length > 1,
        columns: columns.length,
        columnTypes: columnTypes
      });
    }

    return NextResponse.json({
      message: 'CSV file(s) uploaded successfully',
      tables: results,
    });

  } catch (error) {
    console.error('Failed to process CSV file:', error);
    return NextResponse.json(
      { message: `Failed to process CSV file: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}