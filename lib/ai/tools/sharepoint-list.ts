import { tool } from 'ai';
import { z } from 'zod';
import { BedrockAgentClient as BedrockControlPlaneClient, ListKnowledgeBasesCommand, KnowledgeBaseSummary } from "@aws-sdk/client-bedrock-agent";
import { StandardizedToolResult, TimelineItemUtils } from './types';

// Initialize AWS SDK client for listing knowledge bases
const bedrockControlPlaneClient = new BedrockControlPlaneClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});

// Default max results per page
const DEFAULT_MAX_RESULTS = 100;

// Define the parameters schema
const sharepointListParameters = z.object({
  maxResults: z.number().optional().default(DEFAULT_MAX_RESULTS),
});

interface SharepointListProps {
  // dataStream: DataStreamWriter; // No longer needed here
}

export const sharepointList = ({}: SharepointListProps) => tool({
  description: 'Lists all available SharePoint knowledge bases and their details.',
  parameters: sharepointListParameters,
  execute: async ({ maxResults }: z.infer<typeof sharepointListParameters>): Promise<StandardizedToolResult> => {
    let allKnowledgeBases: { id: string; name: string; description: string; status: string; }[] = [];
    let nextToken: string | undefined = undefined;
    let operationError: any = undefined;

    try {
      do {
        const command: ListKnowledgeBasesCommand = new ListKnowledgeBasesCommand({
          maxResults,
          nextToken: nextToken,
        });

        const response = await bedrockControlPlaneClient.send(command);

        if (response.knowledgeBaseSummaries) {
          const activeKBs = response.knowledgeBaseSummaries.filter((kb: KnowledgeBaseSummary) => kb.status === 'ACTIVE');
          allKnowledgeBases = [
            ...allKnowledgeBases,
            ...activeKBs.map((kb: KnowledgeBaseSummary) => ({
              id: kb.knowledgeBaseId || '',
              name: kb.name || '',
              description: kb.description || '',
              status: kb.status || ''
            }))
          ];
        }
        nextToken = response.nextToken;
      } while (nextToken);

      // Create timeline items from knowledge bases
      const timelineItems = allKnowledgeBases.map(kb => 
        TimelineItemUtils.createKnowledgeBaseItem(kb)
      );

      return { 
        data: allKnowledgeBases, // Keep original data for backward compatibility
        timelineItems,
        summary: {
          message: `Found ${allKnowledgeBases.length} active knowledge bases`,
          itemCount: allKnowledgeBases.length,
          successCount: allKnowledgeBases.length,
          errorCount: 0,
        },
        metadata: {
          toolName: 'sharepoint_list',
          resultType: 'list',
        }
      };

    } catch (error) {
      operationError = error instanceof Error ? error.message : String(error);
      return { 
        error: operationError, 
        data: [],
        timelineItems: [],
        summary: {
          message: `Failed to list knowledge bases: ${operationError}`,
          itemCount: 0,
          successCount: 0,
          errorCount: 1,
        },
        metadata: {
          toolName: 'sharepoint_list',
          resultType: 'list',
        }
      };
    }
  },
}); 