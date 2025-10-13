import { tool } from 'ai';
import { z } from 'zod/v3';
// AWS SDK imports disabled after migration to Gemini
// import { BedrockAgentClient as BedrockControlPlaneClient, ListKnowledgeBasesCommand, type KnowledgeBaseSummary } from "@aws-sdk/client-bedrock-agent";
import { type StandardizedToolResult, TimelineItemUtils } from './types';

type KnowledgeBaseSummary = {
  knowledgeBaseId?: string;
  name?: string;
  description?: string;
  status?: string;
};

// AWS SDK client disabled after migration to Gemini
// const bedrockControlPlaneClient = new BedrockControlPlaneClient({
//   region: process.env.AWS_REGION || 'eu-central-1',
// });

// Default max results per page
const DEFAULT_MAX_RESULTS = 100;

// Define the parameters schema
const sharepointListParameters = z.object({
  maxResults: z.number().optional().default(DEFAULT_MAX_RESULTS),
});

type SharepointListProps = {}

export const sharepointList = ({}: SharepointListProps) => tool({
  description: 'Lists all available SharePoint knowledge bases and their details.',
  inputSchema: sharepointListParameters,
  execute: async ({ maxResults }: z.infer<typeof sharepointListParameters>): Promise<StandardizedToolResult> => {
    throw new Error('SharePoint knowledge base listing is not available after migration to Gemini');
  },
}); 