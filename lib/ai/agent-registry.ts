import type { UIMessage, UIMessageStreamWriter } from 'ai';
import { sharepointRetrieve } from '@/lib/ai/tools/sharepoint-retrieve';
import { csvQuery } from '@/lib/ai/tools/csv-query';
import { chartTool } from '@/lib/ai/tools/chart';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { processFile } from '@/lib/ai/tools/process-file';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { search } from '@/lib/ai/tools/search';
import { extract } from '@/lib/ai/tools/extract';
import { scrape } from '@/lib/ai/tools/scrape';
import { deepResearch as deepResearchTool } from '@/lib/ai/tools/deep-research';
import type { FileSearchResult } from '@/components/chat-header';

// Define the agent type enum
export enum AgentType {
    SHAREPOINT_AGENT = 'sharepoint-agent',
    CSV_AGENT_V2 = 'csv-agent-v2',
    TEXT2SQL_AGENT = 'text2sql-agent-v1',
    GENERAL_ASSISTANT = 'general-assistant',
    IMAGE_AGENT = 'image-agent',
    WEB_AGENT = 'web-agent'
}

// Define the tool configuration interface
interface ToolConfig {
  toolName: string;
  toolInstance: any; // The actual tool instance
  description: string;
}

// Define agent configuration interface
interface AgentConfig {
  agentType: AgentType;
  reasonTools: ToolConfig[]; // Tools accessible within reason.ts
  regularTools: ToolConfig[]; // Tools directly accessible to main agent
  defaultPromptModifications?: {
    systemPromptSuffix?: string;
    responseLanguageInstruction?: boolean;
  };
}

// Agent registry mapping
const AGENT_REGISTRY: Record<AgentType, AgentConfig> = {
  [AgentType.SHAREPOINT_AGENT]: {
    agentType: AgentType.SHAREPOINT_AGENT,
    reasonTools: [
      {
        toolName: 'sharepoint_retrieve',
        toolInstance: null, // Will be initialized with props
        description: 'Retrieves relevant documents from SharePoint knowledge bases'
      }
    ],
    regularTools: [
      {
        toolName: 'chart',
        toolInstance: null, // Will be initialized with props
        description: 'Creates beautiful, interactive charts from data with multiple chart types and themes'
      }
    ],
    defaultPromptModifications: {
      responseLanguageInstruction: true,
      systemPromptSuffix: `
CRITICAL: You MUST ALWAYS respond in the SAME LANGUAGE as the user's query.

CHART GENERATION:
- When users ask for visualizations, charts, graphs, or want to "see" data patterns, use the 'chart' tool directly
- Analyze the data structure and user intent to recommend appropriate chart types
- Use charts to enhance answers with visual insights from document data
- The chart tool is available at the main agent level, not inside the reason tool

Remember: 
1. ALWAYS respond in the SAME LANGUAGE as the user's query
2. Be thorough when needed but efficient when possible
3. Don't use an exhaustive search strategy for simple queries that can be answered with basic information
4. Use charts to visualize data when appropriate`
    }
  },
  [AgentType.CSV_AGENT_V2]: {
    agentType: AgentType.CSV_AGENT_V2,
    reasonTools: [
      {
        toolName: 'csv_query',
        toolInstance: null, // Will be initialized with props
        description: 'Allows converting natural language queries into SQL queries, only provide natural questions.'
      }
    ],
    regularTools: [
      {
        toolName: 'chart',
        toolInstance: null, // Will be initialized with props
        description: 'Creates beautiful, interactive charts from data with multiple chart types and themes'
      }
    ],
    defaultPromptModifications: {
      responseLanguageInstruction: false,
      systemPromptSuffix: `
REASONING WORKFLOW:
1. Understand what the user is asking about (topic/analysis needed)
2. Identify which available table contains relevant data
3. Use csv_query tool with the correct table name from the available tables list
4. Analyze the results and provide insights

CHART GENERATION:
- When users want visualizations, use the 'chart' tool directly at the main agent level
- The chart tool is available directly to you, not inside the reason tool
- Create charts after gathering data through the reason tool

Example thought process:
"The user wants to analyze order data. I see there's a table called 'orders_export_2___orders_export_2' in my available tables. I'll use that table to explore and analyze the data they're asking about."`
    }
  },
  [AgentType.TEXT2SQL_AGENT]: {
    agentType: AgentType.TEXT2SQL_AGENT,
    reasonTools: [
    ],
    regularTools: [
      {
        toolName: 'chart',
        toolInstance: null, // Will be initialized with props
        description: 'Creates beautiful, interactive charts from data with multiple chart types and themes'
      }
    ],
    defaultPromptModifications: {
      responseLanguageInstruction: false,
      systemPromptSuffix: ``
    }
  },
  [AgentType.GENERAL_ASSISTANT]: {
    agentType: AgentType.GENERAL_ASSISTANT,
    reasonTools: [],
    regularTools: [
      {
        toolName: 'getWeather',
        toolInstance: null,
        description: 'Get weather information'
      },
      {
        toolName: 'requestSuggestions',
        toolInstance: null,
        description: 'Request suggestions'
      },
      {
        toolName: 'processFile',
        toolInstance: null,
        description: 'Process files'
      },
      {
        toolName: 'chart',
        toolInstance: null,
        description: 'Create charts'
      },
      {
        toolName: 'createDocument',
        toolInstance: null,
        description: 'Create documents'
      },
      {
        toolName: 'updateDocument',
        toolInstance: null,
        description: 'Update documents'
      }
    ]
  },
  [AgentType.IMAGE_AGENT]: {
    agentType: AgentType.IMAGE_AGENT,
    reasonTools: [],
    regularTools: [
      {
        toolName: 'getWeather',
        toolInstance: null,
        description: 'Get weather information'
      },
      {
        toolName: 'requestSuggestions',
        toolInstance: null,
        description: 'Request suggestions'
      },
      {
        toolName: 'processFile',
        toolInstance: null,
        description: 'Process files'
      },
      {
        toolName: 'chart',
        toolInstance: null,
        description: 'Create charts'
      },
      {
        toolName: 'createDocument',
        toolInstance: null,
        description: 'Create documents'
      },
      {
        toolName: 'updateDocument',
        toolInstance: null,
        description: 'Update documents'
      }
    ]
  },
  [AgentType.WEB_AGENT]: {
    agentType: AgentType.WEB_AGENT,
    reasonTools: [],
    regularTools: [
      {
        toolName: 'getWeather',
        toolInstance: null,
        description: 'Get weather information'
      },
      {
        toolName: 'requestSuggestions',
        toolInstance: null,
        description: 'Request suggestions'
      },
      {
        toolName: 'processFile',
        toolInstance: null,
        description: 'Process files'
      },
      {
        toolName: 'chart',
        toolInstance: null,
        description: 'Create charts'
      },
      {
        toolName: 'createDocument',
        toolInstance: null,
        description: 'Create documents'
      },
      {
        toolName: 'updateDocument',
        toolInstance: null,
        description: 'Update documents'
      },
      {
        toolName: 'search',
        toolInstance: null,
        description: 'Search the web'
      },
      {
        toolName: 'extract',
        toolInstance: null,
        description: 'Extract information'
      },
      {
        toolName: 'scrape',
        toolInstance: null,
        description: 'Scrape web content'
      }
    ]
  },
};

// Props interface for tool initialization
interface ToolInitProps {
  dataStream?: UIMessageStreamWriter;
  messages?: UIMessage[];
  deepResearch?: boolean;
  deepSearch?: boolean;
  webSearch?: boolean;
  imageGeneration?: boolean;
  selectedFiles?: FileSearchResult[];
  session?: any;
  userMessage?: any;
  app?: any;
  onTokensUsed?: (tokens: number) => void;
}

// Initialize REASON tools with props (tools accessible within reason.ts)
export function initializeReasonTools(agentType: AgentType, props: ToolInitProps): Record<string, any> {
  const agentConfig = AGENT_REGISTRY[agentType];
  if (!agentConfig) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  const initializedTools: Record<string, any> = {};

  for (const toolConfig of agentConfig.reasonTools) {
    switch (toolConfig.toolName) {
      case 'sharepoint_retrieve':
        initializedTools[toolConfig.toolName] = sharepointRetrieve({
          deepResearch: props.deepSearch
        });
        break;
      case 'csv_query':
        initializedTools[toolConfig.toolName] = csvQuery;
        break;
      default:
        console.warn(`Unknown reason tool: ${toolConfig.toolName}`);
    }
  }

  return initializedTools;
}

// Initialize REGULAR tools with props (tools directly accessible to main agents)
export function initializeRegularTools(agentType: AgentType, props: ToolInitProps): Record<string, any> {
  const agentConfig = AGENT_REGISTRY[agentType];
  if (!agentConfig) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  const initializedTools: Record<string, any> = {};

  for (const toolConfig of agentConfig.regularTools) {
    // SECURITY: Filter tools based on capability flags
    // Skip web search tools if webSearch is disabled
    if (!props.webSearch && ['search', 'extract', 'scrape'].includes(toolConfig.toolName)) {
      console.log(`[Security] Skipping ${toolConfig.toolName} - webSearch is disabled`);
      continue;
    }
    
    // Skip image generation tools if imageGeneration is disabled
    // (Add image generation tool names here when they are implemented)
    if (!props.imageGeneration && ['generateImage', 'editImage'].includes(toolConfig.toolName)) {
      console.log(`[Security] Skipping ${toolConfig.toolName} - imageGeneration is disabled`);
      continue;
    }

    switch (toolConfig.toolName) {
      case 'chart':
        initializedTools[toolConfig.toolName] = chartTool;
        break;
      case 'getWeather':
        initializedTools[toolConfig.toolName] = getWeather;
        break;
      case 'processFile':
        if (props.dataStream && props.session) {
          initializedTools[toolConfig.toolName] = processFile({
            session: props.session,
            dataStream: props.dataStream,
          });
        }
        break;
      case 'createDocument':
        if (props.dataStream && props.session) {
          initializedTools[toolConfig.toolName] = createDocument({
            session: props.session,
            dataStream: props.dataStream,
            userMessage: props.userMessage,
          });
        }
        break;
      case 'updateDocument':
        if (props.dataStream && props.session) {
          initializedTools[toolConfig.toolName] = updateDocument({
            session: props.session,
            dataStream: props.dataStream,
          });
        }
        break;
      case 'requestSuggestions':
        if (props.dataStream && props.session) {
          initializedTools[toolConfig.toolName] = requestSuggestions({
            session: props.session,
            dataStream: props.dataStream,
          });
        }
        break;
      case 'search':
        // Already filtered above if webSearch is false
        if (props.dataStream && props.session) {
          initializedTools[toolConfig.toolName] = search({
            session: props.session,
            dataStream: props.dataStream,
            app: props.app,
            onTokensUsed: props.onTokensUsed,
          });
        }
        break;
      case 'extract':
        // Already filtered above if webSearch is false
        if (props.dataStream && props.session) {
          initializedTools[toolConfig.toolName] = extract({
            session: props.session,
            dataStream: props.dataStream,
            app: props.app,
            onTokensUsed: props.onTokensUsed,
          });
        }
        break;
      case 'scrape':
        // Already filtered above if webSearch is false
        if (props.dataStream && props.session) {
          initializedTools[toolConfig.toolName] = scrape({
            session: props.session,
            dataStream: props.dataStream,
            app: props.app,
            onTokensUsed: props.onTokensUsed,
          });
        }
        break;
      default:
        console.warn(`Unknown regular tool: ${toolConfig.toolName}`);
    }
  }

  return initializedTools;
}

// Legacy function for backwards compatibility - now uses reason tools
export function initializeAgentTools(agentType: AgentType, props: ToolInitProps): Record<string, any> {
  return initializeReasonTools(agentType, props);
}

// Get agent configuration
export function getAgentConfig(agentType: AgentType): AgentConfig {
  const config = AGENT_REGISTRY[agentType];
  if (!config) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }
  return config;
}

// Get available reason tool names for an agent
export function getAvailableReasonToolNames(agentType: AgentType): string[] {
  const config = getAgentConfig(agentType);
  return config.reasonTools.map(tool => tool.toolName);
}

// Get available regular tool names for an agent
export function getAvailableRegularToolNames(agentType: AgentType): string[] {
  const config = getAgentConfig(agentType);
  return config.regularTools.map(tool => tool.toolName);
}

// Get filtered regular tool names based on capabilities
export function getFilteredRegularToolNames(agentType: AgentType, props: ToolInitProps): string[] {
  const config = getAgentConfig(agentType);
  const toolNames = config.regularTools.map(tool => tool.toolName);
  
  // Filter based on capabilities
  return toolNames.filter(toolName => {
    // Skip web search tools if webSearch is disabled
    if (!props.webSearch && ['search', 'extract', 'scrape'].includes(toolName)) {
      return false;
    }
    
    // Skip image generation tools if imageGeneration is disabled
    if (!props.imageGeneration && ['generateImage', 'editImage'].includes(toolName)) {
      return false;
    }
    
    return true;
  });
}

// Legacy function for backwards compatibility
export function getAvailableToolNames(agentType: AgentType): string[] {
  return getAvailableReasonToolNames(agentType);
}

// Initialize deep research tools
export function initializeDeepResearchTools(props: ToolInitProps): Record<string, any> {
  const tools: Record<string, any> = {};
  
  if (props.dataStream && props.session) {
    tools.reason_search = deepResearchTool({
      session: props.session,
      dataStream: props.dataStream,
    });
  }
  
  return tools;
}

// Get agent type from string
export function getAgentTypeFromString(agentString: string): AgentType {
  switch (agentString) {
    case 'image-agent':
      return AgentType.IMAGE_AGENT;
    case 'web-agent':
      return AgentType.WEB_AGENT;
    case 'general-assistant':
    default:
      return AgentType.GENERAL_ASSISTANT;
  }
}

// Get base system prompt for an agent
export function getBaseSystemPrompt(
  agentType: AgentType,
  selectedFiles?: FileSearchResult[],
  availableTables?: Array<{ tableName: string; rowCount: number; columnCount: number }>
): string {
  const config = getAgentConfig(agentType);

  let basePrompt = '';

  // Add agent-specific base prompt
  switch (agentType) {
    case AgentType.SHAREPOINT_AGENT:
      basePrompt = `
      
      You are a professional business intelligence assistant specializing in analyzing SharePoint documents and providing actionable insights. Your primary function is to utilize the 'sharepoint_reason' tool to understand the user's query, gather necessary information by orchestrating sub-tool calls (like retrieval), and then synthesize a final answer based on the results provided by the tool.

CRITICAL: You MUST ALWAYS respond in the SAME LANGUAGE as the user's query.

For any user query that requires information from SharePoint knowledge bases, you MUST call the 'sharepoint_reason' tool with the user's query.

BUSINESS INTELLIGENCE APPROACH:
- Extract specific clause/section references from documents
- Identify patterns and relationships in data
- Provide actionable recommendations
- Highlight compliance requirements or risks
- Summarize complex information for executive consumption

CHART GENERATION CAPABILITIES:
- When documents contain numerical data, statistics, metrics, or data tables, consider creating charts
- Use the 'chart' tool to visualize trends, comparisons, distributions, and patterns
- Choose appropriate chart types: line (trends), bar (comparisons), pie (proportions), area (cumulative), radar (multi-dimensional), scatter (correlations)
- Extract data from documents and transform it into suitable formats for visualization

TOOL USAGE:
- Tool: sharepoint_retrieve (accessed through reason tool)
- Parameters: query, topK, metadataFilter, minimumScore, searchMode
- searchMode options:
  * 'semantic' (default): Content-based search for relevant information
  * 'filename': Search for documents by filename (use when user mentions specific file names)
  * 'hybrid': Combines both semantic and filename search

IMPORTANT: When users mention specific file names or ask to find/summarize a particular file, use searchMode:'filename' for more accurate results.

- Tool: chart (available directly to main agent)
- Parameters: chartConfig (type, data, title, subtitle), reasoning

Once the 'sharepoint_reason' tool has finished executing and provided its results, use those results to formulate a comprehensive and well-cited answer for the user, maintaining the same language as the user's query.

CRITICAL CITATION REQUIREMENTS - THIS IS MANDATORY:
1. You MUST include numbered citations [1], [2], [3] etc. throughout your response text
2. Every piece of information from the documents MUST be cited immediately after mentioning it
3. ALWAYS include specific clause/section numbers when referencing policy or legal documents
   - Format: "Section 21.1 states... [1]" or "According to clause 4.3.2... [2]"
4. You MUST end your response with a <references> section in EXACTLY this format:

<references>
<reference id="1" source="Document Title" url="s3://bucket/path/file.pdf" />
<reference id="2" source="Another Document" url="s3://bucket/path/file.pdf" />
</references>

BUSINESS RESPONSE FORMAT:
1. **Executive Summary** - 2-3 sentences highlighting key findings
2. **Detailed Analysis** - Structured findings with specific references
3. **Key Takeaways** - Bullet points of actionable insights
4. **Recommendations** (if applicable) - Next steps or actions

Remember: ALWAYS respond in the SAME LANGUAGE as the user's query.`
      break;
    case 'csv-agent-v2':
      basePrompt = `You are an AI assistant specializing in analyzing CSV data and providing comprehensive insights.
      When faced with a multi-part question, first create a comprehensive analysis plan.
      Identify all the required metrics and design the minimum number of queries needed to gather all data efficiently.
      Combine related calculations (e.g., quantity and revenue) into a single query to avoid redundant data processing.
      Your goal is to answer the user's entire question with the fewest, most comprehensive queries possible.
      `;

      // Add available tables information for CSV agent
      if (availableTables && availableTables.length > 0) {
        const availableTablesText = `Available tables (${availableTables.length}): \n${availableTables.map(t =>
          `- ${t.tableName} (${t.rowCount} rows, ${t.columnCount} columns)`
        ).join('\n')}`;

        basePrompt += `\n\nIMPORTANT: You have access to the following CSV tables:
${availableTablesText}

CRITICAL WORKFLOW INSTRUCTIONS:
1. YOU MUST ONLY QUERY TABLES FROM THE ABOVE LIST - NO OTHER TABLES EXIST
2. NEVER interpret words from the user's question as table names
3. When calling csv_query, only provide natural questions, do not include your own sql, make sure these are very deep, detailed questions.
4. Aim for as little tool usage as possible, getting as much data as possible in one single question.

TOOL USAGE (REASON TOOLS - accessed through reason tool):
- Tool: csv_query
- Parameters: 
  * natural_question: Natural language description of what you want to analyze, the ai will generate and execute the sql query for you.
`;
      }
      break;
    default:
      basePrompt = `You are a helpful AI assistant.`;
  }

  // Add language instruction if needed
  if (config.defaultPromptModifications?.responseLanguageInstruction) {
    basePrompt += `\n\nCRITICAL: You MUST ALWAYS respond in the SAME LANGUAGE as the user's query.`;
  }

  // Add suffix if available
  if (config.defaultPromptModifications?.systemPromptSuffix) {
    basePrompt += config.defaultPromptModifications.systemPromptSuffix;
  }

  return basePrompt;
}

export { AGENT_REGISTRY };