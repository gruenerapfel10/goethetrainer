import { streamGeneralAgent } from './general-agent';
import { streamSharePointAgent as streamSharePointAgentV1 } from './sharepoint-agent';
import { streamSharePointAgent as streamSharePointAgentV2 } from './sharepoint-agent-v2';
import { streamCsvAgent } from '@/app/(chat)/api/chat/csv-agent';
import { streamCsvAgent as streamCsvAgentV2 } from '@/app/(chat)/api/chat/csv-agent-v2';
import { streamText2SqlAgent } from "@/app/(chat)/api/chat/text2sql-agent";
import {auth} from "@/app/(auth)/auth";
import {generateUUID, getMostRecentUserMessage} from "@/lib/utils";
import {getChatById, saveChat, saveMessages} from "@/lib/db/queries";
import {generateTitleFromUserMessage} from "@/app/(chat)/actions";
import type {AgentMeta} from "@/app/(chat)/api/chat/agent.type";
import {myProvider} from "@/lib/ai/models";

// Export all agent functions for direct imports if needed
export {
  streamGeneralAgent,
  streamSharePointAgentV1,
  streamSharePointAgentV2,
  streamCsvAgent,
  streamCsvAgentV2,
};

// Define agent types
export const agentTypes = {
  GENERAL: 'general',
  WEB: 'web-agent',
  SHAREPOINT: 'sharepoint-agent',
  SHAREPOINT_V2: 'sharepoint-agent-v2',
  DOCUMENT: 'document-agent',
  CSV: 'csv-agent',
  CSV_V2: 'csv-agent-v2',
  IMAGE: 'image-agent',
  TEXT2SQL: 'text2sql-agent'
} as const;

export type AgentType = (typeof agentTypes)[keyof typeof agentTypes];

export async function streamAgent(json: any) {
  const { messages, id, selectedChatModel, deepResearch, selectedFiles, webSearch, imageGeneration } = json;
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      console.error(`streamAgent: Unauthorized - No session or user ID`);
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage) {
      console.error('streamAgent: No user message found in messages array');
      return new Response('No user message found', { status: 400 });
    }

    let titleInputTokens = 0;
    let titleOutputTokens = 0;
    const chat = await getChatById({ id });
    if (!chat) {
      const { title, inputTokens, outputTokens } =
          await generateTitleFromUserMessage({ message: userMessage });
      await saveChat({ id, userId: session.user.id, title });
      titleInputTokens = inputTokens ?? 0;
      titleOutputTokens = outputTokens ?? 0;
    }

    const model = myProvider.languageModel(selectedChatModel);

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id || generateUUID(),
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
          useCaseId: null,
          agentType: selectedChatModel,
          modelId: model.modelId,
          inputTokens: null,
          outputTokens: null,
          processed: false,
        },
      ],
    });

    const agentMeta: AgentMeta = {
      session,
      userMessage,
      chat,
      titleInputTokens,
      titleOutputTokens,
      model,
    };

  // Map selectedChatModel to the appropriate agent
  switch (selectedChatModel) {
    case agentTypes.WEB:
    case agentTypes.IMAGE:
      // Both web and image agents are now handled by general agent
      return streamGeneralAgent(agentMeta, messages, id, selectedChatModel, webSearch, deepResearch, imageGeneration);

      case agentTypes.SHAREPOINT:
        return streamSharePointAgentV1(agentMeta, messages, id, selectedChatModel);

      case agentTypes.SHAREPOINT_V2:
        return streamSharePointAgentV2(agentMeta, messages, id, selectedChatModel, deepResearch, selectedFiles);

      case agentTypes.CSV:
        return streamCsvAgent(agentMeta, json);

      case agentTypes.CSV_V2:
        return streamCsvAgentV2(agentMeta, messages, id, selectedChatModel);

      case agentTypes.TEXT2SQL:
        return streamText2SqlAgent(agentMeta, messages, id, selectedChatModel);

      default:
        // Default to general agent for any other model
        return streamGeneralAgent(agentMeta, messages, id, selectedChatModel, webSearch, deepResearch, imageGeneration);
    }
  } catch (error) {
    console.error(`Unhandled error in ${selectedChatModel}:`, error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
