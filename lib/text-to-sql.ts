// text-to-sql.ts
//
// THE BRAIN of the operation.
// This file is responsible for instructing the AI how to write universally safe queries
// and for providing a final security check.

import { generateObject } from 'ai';
import { myProvider } from '@/lib/ai/models';
import { z } from 'zod';

const sqlQuerySchema = z.object({
  query: z.string().describe('The complete, executable PostgreSQL query.'),
  explanation: z.string().describe('A one-liner explanation of the query in natural language.'),
  error: z.string().optional().describe('Any error that occurred during query generation.')
});

interface TableInfo {
  tableName: string;
  // We ONLY provide column names. No types. No sample data.
  // This forces the AI to always use the safe pattern.
  columns: string[];
}

/**
 * Generates the master system prompt for the AI.
 * This prompt is engineered to be simple, direct, and non-negotiable.
 */
function generateSystemPrompt(tableInfo: TableInfo): string {
  const columnList = tableInfo.columns.map(col => `  - "${col}"`).join('\n');

  return `You are an elite PostgreSQL expert. Your only task is to convert a user's question into a single, robust, and executable PostgreSQL SELECT query.

TABLE INFORMATION:
- Table Name: "${tableInfo.tableName}"
- Available Columns:
${columnList}

---
CRITICAL QUERYING RULES:

1.  **SELECT ONLY**: You MUST only generate SELECT queries.
2.  **QUOTING**: ALWAYS wrap all table and column names in double quotes (e.g., "tableName", "columnName").
3.  **BULLETPROOF NUMERIC OPERATIONS**: You do NOT know the data types of the columns. Assume any column you perform math on (SUM, AVG, +, *) could be messy text. You MUST use the following universal pattern to prevent errors. This is not optional.
4.  **ADVANCED GROUPING**: When a user asks to group or aggregate by a calculated field (like creating price ranges), you MUST use a Common Table Expression (CTE). You cannot use a column alias in a GROUP BY clause at the same level it is defined.
5.  **LIMITS**: NEVER USE LIMITS, we want as much data as possible.

**CORRECT PATTERN (using a CTE):**
\`\`\`sql
WITH "aliased_data" AS (
  SELECT
    *, -- Select existing columns
    CASE ... END AS "My Calculated Alias" -- Define the alias here
  FROM "${tableInfo.tableName}"
)
SELECT
  "My Calculated Alias",
  SUM("some_column")
FROM "aliased_data"
GROUP BY "My Calculated Alias"
ORDER BY "My Calculated Alias";
\`\`\`

**WRONG PATTERN (will fail):**
\`\`\`sql
SELECT
  CASE ... END AS "My Alias", -- Alias is defined
  SUM("some_column")
FROM "my_table"
GROUP BY "My Alias"; -- ERROR: "My Alias" does not exist here
\`\`\`

---
**THE ONLY CORRECT PATTERN FOR ALL NUMERIC CALCULATIONS:**
\`\`\`sql
CASE
  WHEN CAST("column_name" AS TEXT) ~ '^-?[0-9]+(\\.[0-9]+)?$'
  THEN CAST("column_name" AS NUMERIC)
  ELSE 0
END
\`\`\`

**WHY THIS PATTERN IS MANDATORY:**
- \`CAST("column_name" AS TEXT)\`: This is the most important step. It works whether the column is already text OR if the database thinks it's a number. It guarantees the next step, a text operation, will succeed.
- \`~ '...' \`: This regular expression safely checks if the string is a valid number.
- \`THEN CAST(... AS NUMERIC)\`: Only after the check passes do you convert to a number for calculations.

**EXAMPLE USAGE:**
To get total revenue from "lineitem_quantity" and "lineitem_price":
\`\`\`sql
SELECT
  "lineitem_sku",
  SUM(
    (CASE WHEN CAST("lineitem_quantity" AS TEXT) ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN CAST("lineitem_quantity" AS NUMERIC) ELSE 0 END)
    *
    (CASE WHEN CAST("lineitem_price" AS TEXT) ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN CAST("lineitem_price" AS NUMERIC) ELSE 0 END)
  ) AS "Total Revenue"
FROM "${tableInfo.tableName}"
GROUP BY "lineitem_sku";
\`\`\`
---

Your response MUST be a single JSON object matching the provided schema.
`;
}

/**
 * Validates a generated SQL query for CRITICAL SECURITY issues ONLY.
 * It no longer validates syntax. That is the job of the prompt.
 */
export function validateSqlQuery(query: string): { isValid: boolean; error?: string } {
  const upperQuery = query.trim().toUpperCase();

  // Security Check: Disallow any keywords that modify data or schema.
  const disallowedKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];
  for (const op of disallowedKeywords) {
    if (upperQuery.includes(op)) {
       const error = `Security Violation: Disallowed keyword "${op}" found. Only SELECT queries are permitted.`;
       console.error(error);
       return { isValid: false, error };
    }
  }

  if (!upperQuery.startsWith('SELECT')) {
    const error = 'Validation Failed: Query must start with SELECT.';
    console.error(error);
    return { isValid: false, error };
  }

  return { isValid: true };
}

/**
 * Generates a SQL query from natural language.
 */
export async function generateSqlQuery(
  naturalLanguageQuery: string,
  tableName: string,
  columns: string[],
): Promise<z.infer<typeof sqlQuerySchema>> {
  console.log('=== TEXT-TO-SQL CONVERSION STARTED ===');
  const startTime = Date.now();

  try {
    const systemPrompt = generateSystemPrompt({ tableName, columns });

    const { object } = await generateObject({
      model: myProvider.languageModel('bedrock-sonnet-latest'),
      schema: sqlQuerySchema,
      system: systemPrompt,
      prompt: `User question: "${naturalLanguageQuery}"`,
    });

    console.log(`SQL generated in ${Date.now() - startTime}ms.`);

    if (!object.query) {
      return { query: '', explanation: '', error: 'AI failed to generate a query.' };
    }

    return object;
  } catch (error) {
    console.error(`Critical error during SQL generation:`, error);
    return { 
      query: '', 
      explanation: '', 
      error: error instanceof Error ? error.message : 'Unknown exception.' 
    };
  }
}