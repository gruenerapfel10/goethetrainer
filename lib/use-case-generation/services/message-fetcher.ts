import type { IMessageFetcher } from '../interfaces';
import { type GroupedChat, AllowedAgentTypes, type AgentType } from '../types';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, } from 'drizzle-orm';
import { message } from '../../db/schema';
import { getLatestUseCasesForChatIds } from '../../db/queries';

// Database client setup
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export class MessageFetcherService implements IMessageFetcher {
  async fetchUnprocessedMessages(): Promise<any[]> {

    // Debugging: Limit fetched messages via environment variable
    const maxMessages = process.env.DEBUG_MAX_MESSAGES
      ? Number.parseInt(process.env.DEBUG_MAX_MESSAGES, 10)
      : undefined;

    if (maxMessages !== undefined && !Number.isNaN(maxMessages)) {
      console.warn(`<<<< DEBUG: Limiting fetched messages to ${maxMessages} >>>>`);
    }

    // Get all unprocessed messages first
    const query = db
      .select({
        chatId: message.chatId,
        messageId: message.id,
        messageContent: message.parts,
        messageRole: message.role,
        messageCreatedAt: message.createdAt,
        agentType: message.agentType,
        inputTokens: message.inputTokens,
        outputTokens: message.outputTokens,
        processed: message.processed
      })
      .from(message)
      .where(eq(message.processed, false))
      .orderBy(message.createdAt);
    // Filter messages by agent type in memory
    const unprocessedMessages = await query;
    
    const filteredMessages = unprocessedMessages.filter(
      msg => msg.agentType && AllowedAgentTypes.includes(msg.agentType as AgentType)
    );

    // Apply the limit if the debug env var is set and valid
    const allUnprocessedMessages = maxMessages && !Number.isNaN(maxMessages)
      ? filteredMessages.slice(0, maxMessages)
      : filteredMessages;
    return allUnprocessedMessages;
  }
  
  groupMessagesByChat(messages: any[]): GroupedChat[] {
    
    const chatMap = new Map<string, GroupedChat>();
    
    messages.forEach(message => {
      if (!chatMap.has(message.chatId)) {
        chatMap.set(message.chatId, {
          chatId: message.chatId,
          processed: message.processed,
          messages: []
        });
      }

      // Temp solution for parts schema mismatch, fix in v2
      const cleanedMessageContent = JSON.stringify(message.messageContent).replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\/g, '').substring(0, 256)
      
      const chat = chatMap.get(message.chatId)!;
      chat.messages.push({
        id: message.messageId,
        parts: cleanedMessageContent,
        role: message.messageRole,
        createdAt: message.messageCreatedAt,
        agentType: message.agentType,
        inputTokens: message.inputTokens,
        outputTokens: message.outputTokens,
        processed: message.processed,
        chatId: message.chatId,
        attachments: message.attachments,
        useCaseId: message.useCaseId,
        modelId: message.useCaseId
      });
    });
    
    const groupedChats = Array.from(chatMap.values());
    
    return groupedChats;
  }
  
  async getLatestUseCasesForChats(chatIds: string[]): Promise<Map<string, any>> {
    
    // Use the existing function from queries
    const useCasesMap = await getLatestUseCasesForChatIds(chatIds);
    
    return useCasesMap;
  }
}