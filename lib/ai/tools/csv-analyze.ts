import { DataStreamWriter, tool, streamObject, generateObject } from 'ai';
import { z } from 'zod';
import { Session } from 'next-auth';
import { jsonrepair } from 'jsonrepair';

import { myProvider } from '../models';
import { executeCsvQuery, listCsvTables } from '@/lib/db/queries';
import { generateObjectWithParsing } from '@/lib/parsingUtils';
import { StandardizedToolResult, TimelineItemUtils } from './types';

interface CsvAnalyzeProps {
    session: Session;
    dataStream: DataStreamWriter;
}

// Helper function to generate consistent operation IDs
let operationCounter = 0;
const generateOperationId = (stage: string) => {
    return `csv-op-${stage}-${++operationCounter}`;
};

// Helper function to write timeline updates
const writeTimelineUpdate = (
    dataStream: DataStreamWriter, 
    id: string, 
    type: 'tool-call' | 'tool-result' | 'text-delta' | 'error',
    status: 'running' | 'completed' | 'failed',
    message: string,
    details?: any
) => {
    dataStream.writeMessageAnnotation({
        type: 'csv_update',
        data: {
            id,
            type,
            status,
            message,
            timestamp: Date.now(),
            details
        }
    });
};

const JSON_SYSTEM_PROMPT = `You are a helpful AI assistant that always provides responses in valid JSON format when requested.

When asked to provide structured data:
1. Always ensure arrays are properly formatted as JSON arrays, never as string representations of arrays
2. Never stringify arrays within JSON objects
3. All array fields must be actual arrays like ["item1", "item2"], not strings containing array syntax
4. Ensure nested objects and arrays maintain proper JSON structure
5. Follow the exact schema specified in the request
6. NEVER return a string that contains JSON - parse it into actual JSON structure
7. NEVER wrap arrays in quotes or return them as strings - they must be actual array structures
8. If a field is supposed to be an array, make sure it is [...] and not "[...]"
9. Check every property of your response before returning to ensure no arrays are incorrectly stringified
      
You must thoroughly check your response before submitting to ensure it is valid JSON with proper type structures.`;


// Helper function to convert a result to JSON-compatible format
const toJsonCompatible = (data: unknown) => {
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (error) {
        console.error("Failed to convert data to JSON-compatible format:", error);
        return Array.isArray(data) ? [] : {};
    }
};

const getUserTables = async (): Promise<Array<{
    tableName: string;
    displayName: string;
    rowCount: number;
}>> => {
    try {
        const allTables = await listCsvTables();
        
        if (!allTables.length) {
            return [];
        }
        
        return allTables.map(table => ({
            tableName: table.tableName,
            displayName: table.tableName, // Use the same name without prefix
            rowCount: table.rowCount || 0 // Handle null by defaulting to 0
        }));
    } catch (error) {
        console.error('Failed to get tables:', error);
        return [];
    }
};

// Helper function to safely parse potentially malformed JSON
const safeJsonParse = (data: string) => {
    try {
        // First try to repair the JSON if needed
        const repaired = jsonrepair(data);
        return JSON.parse(repaired);
    } catch (error) {
        console.error("Failed to repair and parse JSON:", error);
        return null;
    }
};

// Simplified Context Schema
const contextSchema = z.object({
    relevantColumns: z.array(
        z.object({
            tableName: z.string(),
            columnName: z.string(),
            relevance: z.string().optional()
        })
    ).optional(),
    tables: z.array(
        z.object({
            tableName: z.string(),
            displayName: z.string(),
            rowCount: z.number(),
            columns: z.array(
                z.object({
                    name: z.string(),
                    dataType: z.string(),
                    hasMissingValues: z.boolean().optional(),
                    missingCount: z.number().optional()
                })
            ),
            sampleData: z.array(z.record(z.string(), z.any())).optional(),
            dataQualityIssues: z.array(z.string()).optional()
        })
    ),
});

// Plan Design Schema
const planSchema = z.object({
    analyses: z.array(
        z.object({
            type: z.string(),
            description: z.string(),
            importance: z.number().min(1).max(5),
        }),
    ).min(1).max(2),
    queries: z.array(
        z.object({
            query: z.string(),
            rationale: z.string(),
            operation: z.enum(['explore', 'filter', 'analyze', 'summarize']),
            priority: z.number().min(1).max(5),
        }),
    ).min(1).max(4)
});

// Plan Execution Schema
const executionSchema = z.object({
    findings: z.array(
        z.object({
            insight: z.string(),
            evidence: z.array(z.string()),
            confidence: z.number().min(0).max(1),
        }),
    ),
    implications: z.array(z.string()),
    limitations: z.array(z.string()),
});

// Context Ascertainment - Analyze available data and determine relevant columns
const ascertainContext = async (topic: string, dataStream: DataStreamWriter, userTables: Array<{
    tableName: string;
    displayName: string;
    rowCount: number;
}>) => {
    const contextOpId = generateOperationId('context');
    
    // Start context analysis
    writeTimelineUpdate(
        dataStream,
        contextOpId,
        'tool-call',
        'running',
        'Analyzing data structure and quality across tables...',
        { toolName: 'csv_analyze', stage: 'context' }
    );

    try {
        // Initialize array to store table information
        const tablesData = [];
        
        // Process each table
        for (const table of userTables) {
            const { tableName, displayName, rowCount } = table;
            
            try {
                // Quote the table name to handle special characters like hyphens
                const quotedTableName = `"${tableName}"`;
                
                // Query 1: Get column names and data types
                const columnQuery = `
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '${tableName}'
                    ORDER BY ordinal_position`;
                
                const columns = await executeCsvQuery(columnQuery);
                
                // Query 2: Get sample data (first 3 rows)
                const sampleDataQuery = `SELECT * FROM ${quotedTableName} LIMIT 5`;
                const sampleData = await executeCsvQuery(sampleDataQuery);
                
                // Process column info including missing value check
                const columnInfo = await Promise.all(
                    columns.map(async (col: any) => {
                        try {
                            // Check for null values
                            const nullQuery = `SELECT COUNT(*) as null_count FROM ${quotedTableName} WHERE "${col.column_name}" IS NULL OR CAST("${col.column_name}" AS TEXT) = ''`;
                            const nullResult = await executeCsvQuery(nullQuery);
                            const missingCount = nullResult[0]?.null_count || 0;
                            
                            return {
                                name: col.column_name,
                                dataType: col.data_type,
                                hasMissingValues: missingCount > 0,
                                missingCount: missingCount
                            };
                        } catch (error) {
                            console.error(`Error checking nulls for column ${col.column_name}:`, error);
                            return {
                                name: col.column_name,
                                dataType: col.data_type,
                                hasMissingValues: false,
                                missingCount: 0,
                                error: true
                            };
                        }
                    })
                );
                
                // Identify data quality issues
                const dataQualityIssues = [];
                
                // Check for missing values
                const columnsWithMissingValues = columnInfo.filter(col => col.hasMissingValues);
                if (columnsWithMissingValues.length > 0) {
                    dataQualityIssues.push(`Missing values in columns: ${columnsWithMissingValues.map(col => col.name).join(', ')}`);
                }
                
                // Check for columns with high missing rates (more than 50%)
                const highMissingColumns = columnInfo.filter(col => col.missingCount > rowCount * 0.5);
                if (highMissingColumns.length > 0) {
                    dataQualityIssues.push(`Columns with >50% missing data: ${highMissingColumns.map(col => col.name).join(', ')}`);
                }
                
                // Add table data to collection
                tablesData.push({
                    tableName,
                    displayName,
                    rowCount,
                    columns: columnInfo,
                    sampleData,
                    dataQualityIssues
                });
                
                // Send progressive table update with columns
                dataStream.writeMessageAnnotation({
                    type: 'csv_update',
                    data: JSON.parse(JSON.stringify({
                        id: 'tables-update',
                        type: 'analysis',
                        status: 'completed',
                        title: 'Available Tables',
                        message: `Analyzed ${tablesData.length}/${userTables.length} tables`,
                        timestamp: Date.now(),
                        tables: tablesData.map(table => ({
                            tableName: table.tableName,
                            displayName: table.displayName,
                            rowCount: table.rowCount,
                            columns: table.columns
                        })),
                    })),
                });
            } catch (error) {
                console.error(`Error processing table ${tableName}:`, error);
                // Continue to the next table instead of failing the entire process
                continue;
            }
        }
            
        // Build a clean context object
        const context: z.infer<typeof contextSchema> = {
            tables: tablesData
        };

        // Prepare a comprehensive prompt that includes all tables for AI analysis
        const tablesDescription = tablesData.map(table => {
            return `Table: ${table.displayName} (${table.rowCount} rows)
Columns:
${table.columns.map(col => `- ${col.name} (${col.dataType}${col.hasMissingValues ? `, ${col.missingCount} missing values` : ''})`).join('\n')}

Sample data (first row):
${table.sampleData && table.sampleData[0] ? Object.entries(table.sampleData[0]).map(([key, value]) => `${key}: ${value}`).join(', ') : 'No sample data available'}

${table.dataQualityIssues && table.dataQualityIssues.length > 0 ? `Data quality issues:
- ${table.dataQualityIssues.join('\n- ')}` : 'No data quality issues detected'}
`;
        }).join('\n\n');

        // Use AI to identify relevant columns for the analysis topic
        const contextPrompt = `Analyze these data tables and identify which columns are most relevant for analyzing this user request: "${topic}"
---
${tablesDescription}
---
Based on this analysis, identify:
1. Which columns from which tables are most relevant for the topic "${topic}"
2. Why these columns are relevant (briefly)`;

        const { object: aiInsights } = await generateObjectWithParsing({
            model: myProvider.languageModel('bedrock-sonnet-latest'),
            schema: contextSchema,
            prompt: contextPrompt,
            system: JSON_SYSTEM_PROMPT,
            temperature: 0,
        });

        // Add AI insights about relevant columns if available
        if (aiInsights && aiInsights.relevantColumns) {
            context.relevantColumns = aiInsights.relevantColumns;
        } else {
            // Create simple relevance suggestions if AI didn't provide any
            const allColumns: Array<{tableName: string; columnName: string}> = [];
            tablesData.forEach(table => {
                table.columns.forEach(col => {
                    allColumns.push({
                        tableName: table.tableName,
                        columnName: col.name
                    });
                });
            });
            
            // Just include all columns as potentially relevant if we can't get better insights
            context.relevantColumns = allColumns;
        }

        // Format findings to match expected format in CsvStreamUpdate
        const findings = [
            {
                insight: `Found ${tablesData.length} tables with ${tablesData.reduce((sum, table) => sum + table.columns.length, 0)} total columns`,
                evidence: tablesData.map(table => `${table.displayName}: ${table.columns.length} columns, ${table.rowCount} rows`),
                confidence: 0.95,
            },
            {
                insight: 'Data quality assessment',
                evidence: tablesData.flatMap(table => table.dataQualityIssues || []),
                confidence: 0.9,
            }
        ];
        
        if (context.relevantColumns && context.relevantColumns.length > 0) {
            findings.push({
                insight: `Identified ${context.relevantColumns.length} relevant columns for "${topic}"`,
                evidence: context.relevantColumns.map((col: {tableName: string; columnName: string; relevance?: string}) => 
                    `${col.tableName}: ${col.columnName}${col.relevance ? ` (${col.relevance})` : ''}`),
                confidence: 0.85,
            });
        }

        // Add a structured summary for display
        dataStream.writeMessageAnnotation({
            type: 'csv_update',
            data: {
                id: 'context-ascertainment',
                type: 'analysis',
                status: 'completed',
                title: 'Data Context Analysis',
                findings,
                analysisType: 'context',
                message: `Analyzed ${tablesData.length} tables with ${tablesData.reduce((sum, table) => sum + table.columns.length, 0)} total columns`,
                timestamp: Date.now(),
                overwrite: true,
                recommendations: [
                    {
                        action: 'Focus on relevant columns for analysis',
                        rationale: `These columns are most relevant to the "${topic}" topic`,
                        priority: 4,
                    },
                    {
                        action: 'Consider data quality issues',
                        rationale: 'Address potential data quality concerns before analysis',
                        priority: 3,
                    },
                ],
                uncertainties: tablesData.flatMap(table => table.dataQualityIssues || []).length > 0
                    ? tablesData.flatMap(table => table.dataQualityIssues || [])
                    : ['No major data quality issues identified'],
            },
        });

        return context;
    } catch (error) {
        console.error('Error generating context:', error);
        throw new Error('Failed to generate valid context');
    }
};

// Plan Design - Create analysis strategy based on context
const designPlan = async (topic: string, context: z.infer<typeof contextSchema>, dataStream: DataStreamWriter) => {
    // Set all subsequent stages to pending
    dataStream.writeMessageAnnotation({
        type: 'csv_update',
        data: {
            id: 'query-execution',
            type: 'query',
            status: 'pending',
            title: `Queries`,
            message: `Waiting for query execution...`,
            timestamp: Date.now(),
        },
    });

    // Mark plan design as running
    dataStream.writeMessageAnnotation({
        type: 'csv_update',
        data: {
            id: 'plan-design',
            type: 'plan',
            status: 'running',
            title: 'Analysis Plan',
            message: 'Creating analysis plan...',
            timestamp: Date.now(),
        },
    });

    try {
        // Find the table with the most relevant columns for this analysis
        let primaryTableName = '';
        let primaryTableColumns: any[] = [];
        
        if (context.tables && context.tables.length > 0) {
            // Default to the first table if we can't determine relevance
            primaryTableName = context.tables[0].tableName;
            primaryTableColumns = context.tables[0].columns;
            
            // If we have relevance information, find the table with most relevant columns
            if (context.relevantColumns && context.relevantColumns.length > 0) {
                // Count relevant columns by table
                const tableCounts: Record<string, number> = {};
                context.relevantColumns.forEach(col => {
                    tableCounts[col.tableName] = (tableCounts[col.tableName] || 0) + 1;
                });
                
                // Find table with most relevant columns
                let maxCount = 0;
                Object.entries(tableCounts).forEach(([tableName, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        primaryTableName = tableName;
                    }
                });
                
                // Get the columns for this table
                const primaryTable = context.tables.find(t => t.tableName === primaryTableName);
                if (primaryTable) {
                    primaryTableColumns = primaryTable.columns;
                }
            }
        }
        
        const quotedPrimaryTableName = `"${primaryTableName}"`;
        
        // Create a formatted string of available columns for the prompt
        const availableColumnsText = primaryTableColumns
            .map(col => `- ${col.name} (${col.dataType}${col.hasMissingValues ? `, ${col.missingCount} missing values` : ''})`)
            .join('\n');
        
        const planPrompt = `A user has this question: "${topic}"

table name: ${primaryTableName}

available columns:
${availableColumnsText}

Create a detailed fixed-step plan to answer the question.

1. Use ONLY columns that exist in the table. The table has ONLY the columns listed above.
2. ALWAYS wrap both table names AND column names in double quotes in every query.
3. Make sure to escape the quotes in the query so it is valid JSON.
4. The plan should be a detailed fixed-step plan to answer the question.
5. Use CAST with REPLACE ONLY for text columns that contain numeric values.
6. For integer or numeric columns, just use them directly without CAST or REPLACE.
7. Make sure the table name "${primaryTableName}" is properly quoted in each query.

CORRECT SQL examples:
- For text columns: SELECT CAST(REPLACE("text_price_column", ',', '.') AS NUMERIC) AS clean_number FROM "user_table_name"
- For numeric columns: SELECT "numeric_column" AS clean_number FROM "user_table_name"
- WHERE "city_column" = 'Vilnius' AND "numeric_column" > 10
- SELECT * FROM "user_table_name" WHERE "date_column" > '2024-01-01'

INCORRECT SQL examples:
- Using unquoted table names: SELECT * FROM user_table_name
- Using unquoted column names: SELECT price FROM "user_table_name"
- WHERE CAST("integer_column" AS NUMERIC) > 10 -- unnecessary CAST for numeric columns
- GROUP BY CAST("price" AS FLOAT) -- use NUMERIC not FLOAT for monetary values
- Using single quotes for identifiers: SELECT 'column_name' FROM 'table_name'
`;

        
        const result = await generateObject({
            model: myProvider.languageModel('bedrock-sonnet-latest'),
            schema: planSchema,
            prompt: planPrompt,
            system: JSON_SYSTEM_PROMPT,
            temperature: 0.0,
            experimental_repairText: async ({ text, error }) => {
                
                const parsedData = JSON.parse(text);

                const queries = parsedData.queries;
                const parsedQueries = JSON.parse(queries);

                const repairedData = {
                queries: parsedQueries,
                analyses: parsedData.analyses,
                }

                return JSON.stringify(repairedData);
              },
        });

        const plan = result.object;


        if (!plan || !plan.queries || !plan.analyses) {
            throw new Error('Failed to generate valid plan');
        }

        // Ensure all required properties exist in each query and analysis
        const validPlan = {
            queries: plan.queries
                .filter((q): q is NonNullable<typeof q> => q !== undefined)
                .map(q => ({
                    query: q.query || '',
                    rationale: q.rationale || '',
                    operation: q.operation || 'explore',
                    priority: q.priority || 1,
                })),
            analyses: plan.analyses
                .filter((a): a is NonNullable<typeof a> => a !== undefined)
                .map(a => ({
                    type: a.type || '',
                    description: a.description || '',
                    importance: a.importance || 1,
                })),
        };


        dataStream.writeMessageAnnotation({
            type: 'csv_update',
            data: {
                id: 'plan-design',
                type: 'plan',
                status: 'completed',
                title: 'Analysis Plan',
                plan: validPlan,
                totalSteps: validPlan.queries.length + validPlan.analyses.length,
                message: `Created analysis plan with ${validPlan.queries.length} queries and ${validPlan.analyses.length} analyses`,
                timestamp: Date.now(),
                overwrite: true,
            },
        });

        return validPlan;
    } catch (error) {
        console.error('Error generating plan:', error);
        throw new Error('Failed to generate valid plan');
    }
};

// Plan Execution - Execute queries and perform analysis
const executePlan = async (
    plan: NonNullable<z.infer<typeof planSchema>>,
    dataStream: DataStreamWriter
) => {
    const queryResults = [];
    let completedSteps = 0;
    const totalSteps = plan.queries.length + plan.analyses.length;

    // Set all analyses to pending status first
    if (plan.analyses.length > 0) {
        for (const [index, analysisReq] of plan.analyses.entries()) {
            const analysisId = `analysis-${index}`;
            dataStream.writeMessageAnnotation({
                type: 'csv_update',
                data: {
                    id: analysisId,
                    type: 'analysis',
                    status: 'pending',
                    title: `${analysisReq.type} Analysis`,
                    message: `Waiting for ${analysisReq.type} analysis...`,
                    analysisType: analysisReq.type,
                    timestamp: Date.now(),
                },
            });
        }
    }
    
    // Mark query execution as running
    dataStream.writeMessageAnnotation({
        type: 'csv_update',
        data: {
            id: 'query-execution',
            type: 'query',
            status: 'running',
            title: `Executing Queries`,
            message: `Running ${plan.queries.length} SQL queries...`,
            timestamp: Date.now(),
        },
    });

    // Execute queries
    for (const [index, query] of plan.queries.entries()) {
        try {
            // Update progress for this specific query
            dataStream.writeMessageAnnotation({
                type: 'csv_update',
                data: {
                    id: 'query-progress',
                    type: 'progress',
                    status: 'running',
                    message: `Executing query ${index + 1}/${plan.queries.length}: ${query.rationale}`,
                    completedSteps: index,
                    totalSteps: plan.queries.length,
                    timestamp: Date.now(),
                    overwrite: true,
                },
            });
            
            const rawResult = await executeCsvQuery(query.query);
            const safeResult = toJsonCompatible(rawResult);


            queryResults.push({
                type: 'query',
                query,
                results: safeResult,
                rowCount: Array.isArray(safeResult) ? safeResult.length : 0,
                successful: true
            });

            completedSteps++;
            
            // Send real-time update after each query completes
            dataStream.writeMessageAnnotation({
                type: 'csv_update',
                data: {
                    id: 'query-progress',
                    type: 'progress',
                    status: 'running',
                    message: `Completed query ${index + 1}/${plan.queries.length}: Retrieved ${Array.isArray(safeResult) ? safeResult.length : 0} rows`,
                    completedSteps: index + 1,
                    totalSteps: plan.queries.length,
                    timestamp: Date.now(),
                    overwrite: true,
                },
            });
        } catch (error) {
            console.error('Error executing query:', error);

            // Try to identify the issue with the query
            let errorMessage = error instanceof Error ? error.message : String(error);
            let fixSuggestion = '';

            if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
                const match = errorMessage.match(/column "(.*?)" does not exist/);
                const columnName = match ? match[1] : 'unknown';
                fixSuggestion = `Column "${columnName}" doesn't exist. Check the column name and quotes.`;
            } else if (errorMessage.includes('syntax error')) {
                fixSuggestion = 'SQL syntax error. Check the query structure.';
            }

            queryResults.push({
                type: 'query',
                query,
                results: [],
                rowCount: 0,
                successful: false,
                error: errorMessage,
                fix: fixSuggestion
            });

            completedSteps++;
            
            // Send real-time update for failed query
            dataStream.writeMessageAnnotation({
                type: 'csv_update',
                data: {
                    id: 'query-progress',
                    type: 'progress',
                    status: 'running',
                    message: `Failed query ${index + 1}/${plan.queries.length}: ${fixSuggestion || errorMessage}`,
                    completedSteps: index + 1,
                    totalSteps: plan.queries.length,
                    timestamp: Date.now(),
                    overwrite: true,
                },
            });
        }
    }

    // Update the query execution stage to completed
    const successfulQueries = queryResults.filter(q => q.successful);
    const failedQueries = queryResults.filter(q => !q.successful);

    dataStream.writeMessageAnnotation({
        type: 'csv_update',
        data: {
            id: 'query-execution',
            type: 'query',
            status: 'completed',
            title: `Queries Executed`,
            message: `Retrieved data from ${successfulQueries.length}/${queryResults.length} queries`,
            results: queryResults.flatMap(q => q.successful ? q.results : []),
            query: queryResults.map(q => q.query.query).join('\n'),
            timestamp: Date.now(),
            overwrite: true,
        },
    });

    // Update all pending analyses to running and complete them one by one
    for (const [index, analysisReq] of plan.analyses.entries()) {
        const analysisId = `analysis-${index}`;

        // Set to running
        dataStream.writeMessageAnnotation({
            type: 'csv_update',
            data: {
                id: analysisId,
                type: 'analysis',
                status: 'running',
                title: `Analyzing ${analysisReq.type}`,
                message: `Performing ${analysisReq.type} analysis...`,
                analysisType: analysisReq.type,
                timestamp: Date.now(),
                overwrite: true,
            },
        });

        // Add a small delay to provide time for the UI to update
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Analyze results
    let finalAnalysis = null;

    // Provide enhanced context about the results
    const resultsContext = `
  You have ${successfulQueries.length} successful and ${failedQueries.length} failed queries.
  
  ${successfulQueries.length > 0 ?
            `Successful queries returned a total of ${successfulQueries.reduce((sum, q) => sum + q.rowCount, 0)} rows of data.`
            : 'No successful queries.'}
  
  ${failedQueries.length > 0 ?
            `Failed queries errors: ${failedQueries.map(q => q.error).join('; ')}`
            : ''}
  `;

    const analysisPrompt = `Analyze the query results and provide insights for the following data:

Query Results:
${JSON.stringify(queryResults)}

Required Analyses:
${JSON.stringify(plan.analyses)}

Context:
${resultsContext}

Create a focused analysis with:
1. Key findings with supporting evidence
2. Business implications
3. Data limitations and caveats

INCORRECT: { \\n"findings": "[{\\n\\"insight\\": \\"Revenue grew 10%\\",\\n\\"evidence\\": [\\"Q1: $1M\\",\\n\\"Q2: $1.1M\\"],\\n\\"confidence\\": 0.95\\n}],\\n\\"implications\\": [\\"Growth is strong\\"],\\n\\"limitations\\": [\\"Only 6 months of data\\"]\\n}

Please follow the schema exactly. Do not stringify JSON, or return any JSON with any new line characters \\n

CORRECT: { "findings": [{"insight":"Revenue grew 10%","evidence":["Q1: $1M","Q2: $1.1M"],"confidence":0.95}], "implications": ["Growth is strong"], "limitations": ["Only 6 months of data"] }
`;

    try {
        const { object: analysisResult } = await generateObjectWithParsing({
            model: myProvider.languageModel('bedrock-sonnet-latest'),
            schema: executionSchema,
            prompt: analysisPrompt,
            system: JSON_SYSTEM_PROMPT,
            temperature: 0.0,
        });

        finalAnalysis = analysisResult;

        if (!finalAnalysis) {
            throw new Error('Failed to generate valid analysis');
        }

        // Repair findings if it's a string
        if (typeof finalAnalysis.findings === 'string') {
            console.warn('Received findings as string, attempting to repair JSON');
            const repairedJson = safeJsonParse(finalAnalysis.findings);
            finalAnalysis.findings = Array.isArray(repairedJson) ? repairedJson : [];
        }

        // Repair implications if it's a string
        if (typeof finalAnalysis.implications === 'string') {
            console.warn('Received implications as string, attempting to repair JSON');
            const repairedJson = safeJsonParse(finalAnalysis.implications);
            finalAnalysis.implications = Array.isArray(repairedJson) ? repairedJson : [];
        }

        // Repair limitations if it's a string
        if (typeof finalAnalysis.limitations === 'string') {
            console.warn('Received limitations as string, attempting to repair JSON');
            const repairedJson = safeJsonParse(finalAnalysis.limitations);
            finalAnalysis.limitations = Array.isArray(repairedJson) ? repairedJson : [];
        }
    } catch (error) {
        console.error('Error analyzing results:', error);

        // Create fallback analysis with default values
        finalAnalysis = {
            findings: [
                {
                    insight: 'Analysis encountered technical difficulties',
                    evidence: [
                        'The analysis engine experienced validation errors while processing results.',
                        'Some queries may have returned unexpected data formats or encountered errors.'
                    ],
                    confidence: 0.6,
                },
                {
                    insight: 'Basic price information extracted from available data',
                    evidence: [
                        'Data shows variations in pricing based on cargo specifications.',
                        'Multiple delivery points may affect pricing.'
                    ],
                    confidence: 0.7,
                }
            ],
            implications: [
                'Further analysis with refined queries may provide more accurate insights',
                'Consider manual review of the data for more precise pricing information'
            ],
            limitations: [
                'Analysis was limited due to technical issues with data formatting',
                'Query execution errors prevented comprehensive analysis',
                'Generated insights may not reflect the full dataset'
            ]
        };

        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Using fallback analysis due to error:', errorMessage);
    }

    // Ensure findings is an array
    if (!finalAnalysis.findings || !Array.isArray(finalAnalysis.findings)) {
        console.warn('Analysis findings is not an array, creating default findings');
        finalAnalysis.findings = [
            {
                insight: 'Analysis completed with limited data',
                evidence: ['Some queries may have failed to execute properly'],
                confidence: 0.5,
            }
        ];
    }

    // Ensure all required properties exist in findings
    const validFindings = finalAnalysis.findings
        .filter((f): f is NonNullable<typeof f> => f !== undefined)
        .map(f => ({
            insight: f.insight || '',
            evidence: (f.evidence || []).filter((e): e is string => typeof e === 'string'),
            confidence: f.confidence || 0,
        }));

    // Ensure implications and limitations are arrays
    const validImplications = Array.isArray(finalAnalysis.implications)
        ? finalAnalysis.implications.filter((i): i is string => typeof i === 'string')
        : ['Analysis may be incomplete due to query execution issues'];

    const validLimitations = Array.isArray(finalAnalysis.limitations)
        ? finalAnalysis.limitations.filter((l): l is string => typeof l === 'string')
        : ['Some queries failed to execute properly due to column name mismatches'];

    // Complete all pending analyses with the findings - with slight delays
    for (const [index, analysisReq] of plan.analyses.entries()) {
        const analysisId = `analysis-${index}`;

        // Filter findings related to this specific analysis
        const analysisFindings = validFindings.filter(f =>
            f.insight.toLowerCase().includes(analysisReq.type.toLowerCase())
        );

        // If no specific findings for this analysis, include all findings
        const findingsToUse = analysisFindings.length > 0 ? analysisFindings : validFindings;

        // Add a small delay between completing each analysis
        await new Promise(resolve => setTimeout(resolve, 300));

        dataStream.writeMessageAnnotation({
            type: 'csv_update',
            data: {
                id: analysisId,
                type: 'analysis',
                status: 'completed',
                title: `Analysis of ${analysisReq.type}`,
                analysisType: analysisReq.type,
                findings: findingsToUse,
                message: `Completed ${analysisReq.type} analysis with ${findingsToUse.length} findings`,
                timestamp: Date.now(),
                overwrite: true,
            },
        });

        completedSteps++;
    }

    // Send final analysis summary
    dataStream.writeMessageAnnotation({
        type: 'csv_update',
        data: JSON.parse(JSON.stringify({
            id: 'final-analysis',
            type: 'analysis',
            status: 'completed',
            title: 'Analysis Complete',
            findings: validFindings,
            implications: validImplications,
            limitations: validLimitations,
            message: `Generated ${validFindings.length} insights`,
            timestamp: Date.now(),
            overwrite: true,
            completedSteps: totalSteps,
            totalSteps: totalSteps,
            analysisType: 'summary',
            querySuccessRate: `${successfulQueries.length}/${queryResults.length} queries successful`,
            recommendations: [
                {
                    action: 'Review insights and implications',
                    rationale: 'To understand key findings from the data',
                    priority: 5
                },
                {
                    action: 'Consider data quality improvements',
                    rationale: 'To address issues identified during analysis',
                    priority: validLimitations.length > 0 ? 4 : 2
                }
            ],
            uncertainties: validLimitations.length > 0
                ? validLimitations
                : ['No significant limitations identified'],
            ...(failedQueries.length > 0 ? {
                gaps: [{
                    area: 'Query execution',
                    reason: 'Some queries failed to execute properly',
                    additional_queries: failedQueries.map(q => q.query.query)
                }]
            } : {})
        }))
    });

    return {
        findings: validFindings,
        implications: validImplications,
        limitations: validLimitations,
        queryResults: queryResults,
    };
};

export const csvAnalyze = ({ session, dataStream }: CsvAnalyzeProps) => {
    return tool({
        description:
            'Analyzes CSV data by executing SQL queries and providing insights. This tool performs a complete analysis of the specified topic using the available data.',
        parameters: z.object({
            topic: z.string().describe('The specific topic or question to analyze in the CSV data'),
            depth: z
                .enum(['basic', 'advanced'])
                .describe('Analysis depth level')
                .default('basic'),
            tableName: z
                .string()
                .describe('The name of the table to analyze')
                .default('test_csv_import'),
        }),
        execute: async ({
            topic,
            depth,
            tableName,
        }: {
            topic: string;
            depth: 'basic' | 'advanced';
            tableName: string;
        }) => {
            try {
                // Start analysis with simple status
                dataStream.writeMessageAnnotation({
                    type: 'csv_update',
                    data: {
                        id: 'csv-analysis',
                        type: 'analysis',
                        status: 'running',
                        message: `Analyzing: "${topic}"`,
                        timestamp: Date.now(),
                    },
                });

                // Get available tables
                const userTables = await getUserTables();

                // Analyze the context and data
                const context = await ascertainContext(topic, dataStream, userTables);

                // Design analysis plan
                const plan = await designPlan(topic, context, dataStream);

                // Execute the analysis
                const analysis = await executePlan(plan, dataStream);

                // Send final completion update
                dataStream.writeMessageAnnotation({
                    type: 'csv_update',
                    data: {
                        id: 'csv-analysis',
                        type: 'analysis',
                        status: 'completed',
                        message: `Analysis complete: Generated ${analysis.findings.length} insights`,
                        timestamp: Date.now(),
                        overwrite: true,
                    },
                });

                // Return simple, focused results like sharepoint_retrieve
                return {
                    topic,
                    findings: analysis.findings,
                    implications: analysis.implications,
                    limitations: analysis.limitations,
                    queryResults: analysis.queryResults,
                    message: `Analysis complete for "${topic}" with ${analysis.findings.length} insights generated.`
                };
            } catch (error) {
                console.error('CSV analysis failed:', error);

                // Error update
                dataStream.writeMessageAnnotation({
                    type: 'csv_update',
                    data: {
                        id: 'csv-analysis',
                        type: 'error',
                        status: 'failed',
                        message: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
                        timestamp: Date.now(),
                        overwrite: true,
                    },
                });

                return {
                    error: error instanceof Error ? error.message : String(error),
                    topic,
                    findings: [],
                    message: `Analysis failed for "${topic}"`
                };
            }
        },
    });
};