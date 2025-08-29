import type { IUseCaseTriageService } from '../interfaces';
import { type GroupedChat, type MessageMergeInfo, mergeDecisionSchema } from '../types';
import { myProvider } from '../../ai/models';
import { message } from '../../db/schema';
import { withRetry } from '../utils';
import { db } from '../utils';
import { eq } from 'drizzle-orm';
import { generateObject } from 'ai';

/*
  Groups into:
  * messages we need to merge into existing use cases
  * messages we need to generate new use cases for
  
  For merging we do secondary check:
  * Use merge discriminator to check:
    * Is latest use case relevant to existing use case
    *   Yes -> merge into existing use case (push to messagesToMerge)
    *   No -> generate new use case (push to chatsToGenerateThemes)
*/

export class UseCaseTriageService implements IUseCaseTriageService {
  async triageForProcessing(
    processedChats: GroupedChat[],
    useCasesMap: Map<string, any>
  ): Promise<{
    chatsToGenerateThemes: GroupedChat[];
    messagesToMerge: MessageMergeInfo[];
  }> {
    
    const chatsToGenerateThemes: GroupedChat[] = [];
    const messagesToMerge: MessageMergeInfo[] = [];
    
    // Process each chat
    for (const chat of processedChats) {
      const latestUseCase = useCasesMap.get(chat.chatId);
      
      // If it has an existing use case then it is part of an existing chat therefore merging

      if (latestUseCase) {
        // Chat has a use case - check if we should merge
        const shouldMerge = await this.shouldMergeWithExisting(chat, latestUseCase);
        if (shouldMerge) {
          // Add messages to merge list
          messagesToMerge.push({
            chatId: chat.chatId,
            useCaseId: latestUseCase.id,
            messages: chat.messages
          });
        } else {
          // Don't merge - add to theme generation list
          chatsToGenerateThemes.push(chat);
        }
      } else {
        // No use case - add to theme generation list
        chatsToGenerateThemes.push(chat);
      }
    }
    
    return {
      chatsToGenerateThemes,
      messagesToMerge
    };
  }
  
  async shouldMergeWithExisting(chat: GroupedChat, existingUseCase: any): Promise<boolean> {
    if (!existingUseCase) {
      return false;
    }
    
    try {
      let existingMessages: any[] = [];
      let currentChatMessagesFormatted: any[] = [];
      
      // 1. Fetch messages associated with the existing use case
      existingMessages = await db
        .select({
          id: message.id,
          role: message.role,
          parts: message.parts,
          createdAt: message.createdAt,
        })
        .from(message)
        .where(eq(message.useCaseId, existingUseCase.id))
        .orderBy(message.createdAt);
      
      // 2. Format current messages
      currentChatMessagesFormatted = chat.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts,
        createdAt: msg.createdAt
      }));
      
      // Skip AI call if either message set is empty
      if (existingMessages.length === 0 || currentChatMessagesFormatted.length === 0) {
        return false;
      }
      
      // 3. Call AI to make the merge decision
      const discriminatorPrompt = this.generateMergeDiscriminatorPrompt(
        existingMessages, 
        currentChatMessagesFormatted
      );
      
      const result = await withRetry(() => generateObject({
        model: myProvider.languageModel('haiku'),
        schema: mergeDecisionSchema,
        prompt: discriminatorPrompt,
        temperature: 0
      }));
      
      if (result.object && typeof result.object.shouldMerge === 'boolean') {
        const shouldMerge = result.object.shouldMerge;
        return shouldMerge;
      } else {
        console.warn(`  ⚠️ AI Discriminator failed to return a valid decision object for chat ${chat.chatId}. Defaulting to NOT MERGE.`);
        return false;
      }
    } catch (error) {
      console.error(`  Error in discriminator for chat ${chat.chatId}:`, error);
      return false;
    }
  }
  
  private generateMergeDiscriminatorPrompt(existingMessages: any[], currentChatMessages: any[]): string {
    return `
Analyze the two sets of messages provided below: "Existing Use Case Messages" and "New Chat Messages".

Your task is to determine if the "New Chat Messages" represent a direct semantic continuation of the conversation and topic established in the "Existing Use Case Messages".

Consider:
- Are the topics discussed substantially the same?
- Does the new conversation flow naturally from the old one, or does it feel like a completely new request or subject?
- Ignore simple greetings or pleasantries if the core topic changes.

Respond with ONLY a valid JSON object matching this schema:
{
  "shouldMerge": boolean // true if it's a continuation, false if it's a new topic
}

Example:
- If existing messages discuss converting PDF to Word, and new messages ask about converting PNG to JPG -> shouldMerge: false (different specific task, likely new topic)
- If existing messages discuss Q3 sales figures, and new messages ask for a breakdown of Q3 sales by region -> shouldMerge: true (direct continuation/elaboration)
- If existing messages are about vacation policy, and new messages are a simple "Thanks!" -> shouldMerge: true (continuation, albeit trivial)
- If existing messages are about vacation policy, and new messages ask about setting up a new project -> shouldMerge: false (new topic)

--- Existing Use Case Messages ---
${JSON.stringify(existingMessages, null, 2)}

--- New Chat Messages ---
${JSON.stringify(currentChatMessages, null, 2)}

Respond ONLY with the JSON object.
`;
  }
} 