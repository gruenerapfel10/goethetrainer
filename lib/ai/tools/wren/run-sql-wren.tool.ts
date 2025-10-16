import { tool } from 'ai';
import { z } from 'zod';
import {runSql} from "@/lib/wren/wren.api";


export const runSqlWrenTool = tool({
    description: 'Runs a sql query, limits the result to 100 rows, and returns the result',
    inputSchema: z.object({
        sql: z.string().describe('The SQL query to run.'),
    }),
    execute: async ({ sql }) => {
        try {
            return await runSql({
                sql,
                limit: 100,
            });
        } catch (error) {
            console.error(`Critical error in runSql tool:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'An unknown error occurred.',
            };
        }
    },
});
