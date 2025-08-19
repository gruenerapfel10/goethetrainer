import { streamGeneralAgent } from './general-agent';
// Auth removed - no authentication needed
// import {auth} from "@/app/(auth)/auth";
import {generateUUID, getMostRecentUserMessage} from "@/lib/utils";
// Using Firebase instead of PostgreSQL
import {getChatById, saveChat, saveMessages} from "@/lib/firebase/chat-service";
import {generateTitleFromUserMessage} from "@/app/(chat)/actions";
import type {AgentMeta} from "@/app/(chat)/api/chat/agent.type";
import {myProvider} from "@/lib/ai/models";

// Export general agent
export { streamGeneralAgent };

// Define agent types - simplified to just general
export const agentTypes = {
  GENERAL: 'general',
} as const;

export type AgentType = (typeof agentTypes)[keyof typeof agentTypes];

export async function streamAgent(json: any) {
  const { messages, id, selectedChatModel, deepResearch, selectedFiles, webSearch, imageGeneration } = json;
  try {
    // Auth removed - no authentication needed
    const session = { 
      user: { 
        id: 'anonymous-user', 
        email: 'anonymous@example.com',
        name: 'Anonymous User',
        image: null
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    };

    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage) {
      console.error('streamAgent: No user message found in messages array');
      return new Response('No user message found', { status: 400 });
    }

    let titleInputTokens = 0;
    let titleOutputTokens = 0;
    // Database operations using stub functions (no persistence)
    const chat = await getChatById({ id });
    if (!chat) {
      const { title, inputTokens, outputTokens } =
          await generateTitleFromUserMessage({ message: userMessage });
      await saveChat({ id, userId: session.user.id, title });
      titleInputTokens = inputTokens ?? 0;
      titleOutputTokens = outputTokens ?? 0;
    }

    const model = myProvider.languageModel(selectedChatModel);

    // Database save using stub function (no persistence)
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

  // Always use the general agent
  return streamGeneralAgent(agentMeta, messages, id, selectedChatModel, webSearch, deepResearch, imageGeneration);
  } catch (error) {
    console.error(`Unhandled error in ${selectedChatModel}:`, error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
