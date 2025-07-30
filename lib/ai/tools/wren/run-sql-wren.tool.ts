import { tool } from 'ai';
import { z } from 'zod';
import {runSql} from "@/lib/wren/wren.api";


export const runSqlWrenTool = tool({
    description: 'Runs a sql query',
    parameters: z.object({
        sql: z.string().describe('The SQL query to run.'),
    }),
    execute: async ({ sql }) => {
        try {
            return await runSql({
                sql,
            });
        } catch (error) {
            console.error(`Critical error in runSql tool:`, error);
            console.log('=== WREN QUERY FAILED ===');
            return {
                success: false,
                error: error instanceof Error ? error.message : 'An unknown error occurred.',
            };
        }
    },
});
