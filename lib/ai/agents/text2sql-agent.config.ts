import { ToolName } from '@/lib/ai/tools/tool-registry';
import { FeatureName } from '@/lib/ai/features/feature-registry';
import { ModelId } from '@/lib/ai/model-registry';

export const text2sqlAgentConfig = {
  // Agent type identifier
  agentType: 'text2sql-agent' as const,
  // Agent metadata
  metadata: {
    displayName: 'SQL Assistant',
    description: 'Generate and execute SQL queries from natural language',
    displayNameKey: 'agents.text2sql.label',
    descriptionKey: 'agents.text2sql.description',
    icon: 'lineChart',
    modelId: ModelId.CLAUDE_SONNET_4_5,
  },
  // Tools this agent has access to
  tools: [
    ToolName.REASON,
    ToolName.CHART,
    ToolName.TEXT2SQL,
    ToolName.RUN_SQL,
  ],
  
  // Features this agent supports (user-facing UI features)
  features: [] as FeatureName[], // SQL agent doesn't have file search
  
  // File attachments support
  supportsFileAttachments: false,
  
  // Suggested actions for this agent
  suggestedActions: [
    {
      title: 'Show available tables',
      label: 'and their structure.',
      action:
        'Show me all available tables in the database and describe their structure, including column names and data types.',
      titleKey: 'suggestedActions.sql.showTables.title',
      labelKey: 'suggestedActions.sql.showTables.label',
      actionKey: 'suggestedActions.sql.showTables.action',
    },
    {
      title: 'Show sample data',
      label: 'from main tables.',
      action:
        'Show me the top 10 records from the main tables to understand the data structure and content.',
      titleKey: 'suggestedActions.sql.topRecords.title',
      labelKey: 'suggestedActions.sql.topRecords.label',
      actionKey: 'suggestedActions.sql.topRecords.action',
    },
    {
      title: 'Aggregate data analysis',
      label: 'with key metrics.',
      action:
        'Perform aggregate analysis on the data. Show counts, sums, and averages grouped by relevant categories.',
      titleKey: 'suggestedActions.sql.aggregate.title',
      labelKey: 'suggestedActions.sql.aggregate.label',
      actionKey: 'suggestedActions.sql.aggregate.action',
    },
    {
      title: 'Explain table relationships',
      label: 'and data connections.',
      action:
        'Explain the relationships between different tables and how the data is connected across the database.',
      titleKey: 'suggestedActions.sql.relationships.title',
      labelKey: 'suggestedActions.sql.relationships.label',
      actionKey: 'suggestedActions.sql.relationships.action',
    },
  ],
  
  // Model configuration
  model: {
    contextWindow: 150000,
    temperature: 0.2,
    toolChoice: 'auto' as const,
    maxSteps: 12,
  },
  
  // System prompt
  prompt: `You are an expert SQL assistant that helps users query and analyze their database.

CAPABILITIES:
- Convert natural language questions into SQL queries
- Execute SQL queries against the database
- Create visualizations from query results
- Explain query results in business terms

WORKFLOW:
1. Understand the user's question
2. Generate appropriate SQL using the text2sql tool
3. Execute the query using run_sql tool
4. Analyze and present the results
5. Create charts if the data would benefit from visualization

BEST PRACTICES:
- Write efficient, optimized SQL queries
- Always validate queries before execution
- Provide clear explanations of results
- Suggest follow-up analyses when relevant
- Format results for readability`,
};