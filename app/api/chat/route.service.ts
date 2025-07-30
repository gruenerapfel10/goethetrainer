import { streamGeneralAgent } from './general-agent';
import { streamSharePointAgent as streamSharePointAgentV1 } from './sharepoint-agent';
import { streamSharePointAgent as streamSharePointAgentV2 } from './sharepoint-agent-v2';
import { streamDeapResearchAgent } from './deep-research-agent';
import { streamCrawlerAgent } from './crawler-agent';
import { streamCsvAgent } from '@/app/(chat)/api/chat/csv-agent';
import { streamCsvAgent as streamCsvAgentV2 } from '@/app/(chat)/api/chat/csv-agent-v2';
import { streamImageAgent } from './image-agent';

// Export all agent functions for direct imports if needed
export {
  streamGeneralAgent,
  streamSharePointAgentV1,
  streamSharePointAgentV2,
  streamDeapResearchAgent,
  streamCrawlerAgent,
  streamCsvAgent,
  streamCsvAgentV2,
  streamImageAgent,
};

// Define agent types
export const agentTypes = {
  GENERAL: 'general',
  RESEARCH: 'deepresearch-agent',
  CRAWLER: 'crawler-agent',
  SHAREPOINT: 'sharepoint-agent',
  SHAREPOINT_V2: 'sharepoint-agent-v2',
  DOCUMENT: 'document-agent',
  CSV: 'csv-agent',
  CSV_V2: 'csv-agent-v2',
  IMAGE: 'image-agent',
} as const;

export type AgentType = (typeof agentTypes)[keyof typeof agentTypes];

export async function streamAgent(json: any) {
  const { messages, id, selectedChatModel, deepResearch, selectedFiles } = json;

  // Map selectedChatModel to the appropriate agent
  switch (selectedChatModel) {
    case agentTypes.RESEARCH:
      return streamDeapResearchAgent(json);

    case agentTypes.CRAWLER:
      return streamCrawlerAgent(json);

    case agentTypes.SHAREPOINT:
      return streamSharePointAgentV1(messages, id, selectedChatModel);

    case agentTypes.SHAREPOINT_V2:
      return streamSharePointAgentV2(messages, id, selectedChatModel, deepResearch, selectedFiles);

    case agentTypes.CSV:
      return streamCsvAgent(json);

    case agentTypes.CSV_V2:
      return streamCsvAgentV2(messages, id, selectedChatModel);

    case agentTypes.IMAGE:
      return streamImageAgent(messages, id, selectedChatModel);

    default:
      // Default to general agent for any other model
      return streamGeneralAgent(messages, id, selectedChatModel);
  }
}
