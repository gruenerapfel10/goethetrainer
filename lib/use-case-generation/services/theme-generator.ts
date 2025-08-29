import type { IThemeGenerator } from '../interfaces';
import { type AIResponse, type GroupedChat, aiResponseSchema } from '../types';
import { myProvider } from '../../ai/models';
import { withRetry } from '../utils';
import { db } from '../utils';
import { message, useCase } from '../../db/schema';
import { inArray } from 'drizzle-orm';
import {generateObject} from 'ai';

// Constants for better readability
const CHUNK_SIZE = 20;

// Use environment variable for debug override, otherwise use defaults
const DEBUG_THEME_CONCURRENCY = process.env.DEBUG_THEME_CONCURRENCY
  ? Number.parseInt(process.env.DEBUG_THEME_CONCURRENCY, 10)
  : undefined;

// Default worker counts (can still be used as fallback)
const DEVELOPMENT_WORKER_COUNT = 10;
const PRODUCTION_WORKER_COUNT = 10;

const THEME_TYPE_EXAMPLES = [
  "REQUEST", "DISCUSSION", "QUESTION", "HELP", "ISSUE", "FEEDBACK", 
  "CLARIFICATION", "EXPLORATION", "FOLLOW_UP", "INSTRUCTION", 
  "INFORMATION", "OPINION", "SUGGESTION", "COMPLAINT", 
  "TROUBLESHOOTING", "GREETING", "OTHER"
];

export class ThemeGeneratorService implements IThemeGenerator {
  async generateAndSaveThemes(
    chatsToGenerateThemes: GroupedChat[],
    progressCallback?: (details: string) => void
  ): Promise<{ 
    newUseCasesCount: number; 
    processedChatIds: string[];
  }> {
    let themeResults: AIResponse[] = [];
    let processedChatIds: string[] = [];
    
    if (chatsToGenerateThemes.length > 0) {
      
      const baseWorkerCount = process.env.NODE_ENV === 'development' 
        ? DEVELOPMENT_WORKER_COUNT 
        : PRODUCTION_WORKER_COUNT;
        
      // Override with debug value if set and valid, otherwise use base count
      const workerCount = (DEBUG_THEME_CONCURRENCY !== undefined && !Number.isNaN(DEBUG_THEME_CONCURRENCY))
        ? DEBUG_THEME_CONCURRENCY
        : baseWorkerCount;
          
      if (DEBUG_THEME_CONCURRENCY !== undefined && !Number.isNaN(DEBUG_THEME_CONCURRENCY)) {
         } else {
        console.log(`Processing with ${workerCount} workers`);
      }
      if (progressCallback) {
        progressCallback(`Processing ${chatsToGenerateThemes.length} chats with ${workerCount} workers`);
      }
      
      let processedCount = 0;
      const totalToProcess = chatsToGenerateThemes.length;
  
      // Set up a progress tracking mechanism for processChunksInParallel
      const { results: aiResults } = await this.processChunksInParallel(
        chatsToGenerateThemes, 
        workerCount,
        () => {
          processedCount++;
          const percentComplete = Math.round((processedCount / totalToProcess) * 100);
          if (progressCallback) {
            progressCallback(`Processed ${processedCount}/${totalToProcess} chats (${percentComplete}%)`);
          }
        }
      );
      
      themeResults = aiResults;
      processedChatIds = [...new Set(themeResults.map(r => r.chatId))];
      
      const completionMessage = `Generated themes for ${processedChatIds.length} chats`;
      if (progressCallback) {
        progressCallback(completionMessage);
      }
    } else {
      const skipMessage = "No chats/segments identified for new theme generation.";
      if (progressCallback) {
        progressCallback(skipMessage);
      }
    }
  
    // Save Generated Themes as New Use Cases
    let newUseCasesCount = 0;
    
    if (themeResults.length > 0) {
      const totalThemesCount = themeResults.reduce((sum, r) => sum + r.themes.length, 0);
      
      if (progressCallback) {
        progressCallback(`Saving ${totalThemesCount} generated themes`);
      }
      
      // Flatten the results from parallel processing
      const allThemesToSave = themeResults.flatMap(result => 
        result.themes.map(theme => ({ ...theme, chatId: result.chatId }))
      );
      
      // Save the themes, marking associated messages as processed
      const saveResult = await this.saveThemesToUseCase(allThemesToSave, true); 
      newUseCasesCount = saveResult.savedCount;
      
      const saveMessage = `Saved ${newUseCasesCount} new use cases`;
      if (progressCallback) {
        progressCallback(saveMessage);
      }
    } else {
      const skipMessage = "No new themes were generated to save.";
      if (progressCallback) {
        progressCallback(skipMessage);
      }
    }
  
    return { 
      newUseCasesCount, 
      processedChatIds 
    };
  }
  
  async processChat(chat: GroupedChat): Promise<{ 
    results: AIResponse[], 
    mergedChatIds: string[] 
  }> {
    const results: AIResponse[] = [];
    const mergedChatIds: string[] = [];
  
    try {
      
      // Generate themes for new use case with retries
      const prompt = this.generateNewUseCasesPrompt(chat);

      try {
        const result = await withRetry(() => generateObject({
          model: myProvider.languageModel('haiku'),
          schema: aiResponseSchema,
          prompt,
          temperature: 0
        }));
        
        if (result.object?.chats?.[0]) {
          const aiResponse: AIResponse = {
            chatId: result.object.chats[0].chatId,
            themes: result.object.chats[0].themes
          };
          results.push(aiResponse);
        }
      } catch (aiError) {
        console.error(`Failed to process chat ${chat.chatId} with AI after multiple retries:`, aiError);
      }
    } catch (error) {
      console.error(`Failed to process chat ${chat.chatId}:`, error);
    }
  
    return { results, mergedChatIds };
  }
  
  async saveThemesToUseCase(
    themes: Array<{
      chatId: string;
      type: string;
      title: string;
      description: string;
      topic: string;
      timeSaved: string;
      messageIds: string[];
    }>,
    markAsProcessed = false
  ): Promise<{
    savedCount: number;
    errorCount: number;
  }> {
  
    if (themes.length === 0) {
      return { savedCount: 0, errorCount: 0 };
    }
  
    const transactionStartTime = Date.now();
    let savedCount = 0;
    let updatedMessagesCount = 0;
    let errorCount = 0;
  
    try {
      await db.transaction(async (tx) => {
        // 1. Prepare data for bulk insert
        const useCaseValues = themes.map(theme => ({
          categoryId: null,
          chatId: theme.chatId,
          title: theme.title,
          description: theme.description,
          type: theme.type,
          topic: theme.topic,
          timeSaved: theme.timeSaved,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
  
        // 2. Perform bulk insert and get back the new IDs
        const newUseCases = await tx
          .insert(useCase)
          .values(useCaseValues)
          .returning({ id: useCase.id });
  
        if (newUseCases.length !== themes.length) {
          throw new Error(`Bulk insert returned ${newUseCases.length} rows, but expected ${themes.length}.`);
        }
        savedCount = newUseCases.length;
  
        // 3. Prepare updates for messages
        const messageUpdatePromises: Promise<any>[] = [];
        const allMessageIdsToUpdate: string[] = [];
  
        for (let i = 0; i < themes.length; i++) {
          const theme = themes[i];
          const newUseCaseId = newUseCases[i].id;
  
          if (theme.messageIds.length > 0) {
            const updateValues: { useCaseId: string; processed?: boolean; updatedAt: Date } = {
              useCaseId: newUseCaseId,
              updatedAt: new Date(), // Also update the timestamp
            };
            if (markAsProcessed) {
              updateValues.processed = true;
            }
  
            // Instead of awaiting each update, push the promise to an array
            messageUpdatePromises.push(
              tx
                .update(message)
                .set(updateValues)
                .where(inArray(message.id, theme.messageIds))
            );
            // Keep track of total messages being updated for logging
            allMessageIdsToUpdate.push(...theme.messageIds);
          }
        }
  
        // 4. Execute all message updates in parallel within the transaction
        if (messageUpdatePromises.length > 0) {
          await Promise.all(messageUpdatePromises);
          updatedMessagesCount = allMessageIdsToUpdate.length;
        } else {
          console.log('   No messages needed updating.');
        }
      }); // End transaction
  
      const transactionEndTime = Date.now();

  
      return { savedCount, errorCount: 0 }; // Assume success if transaction completes
  
    } catch (error) {
      // Error handling for bulk operations is often all-or-nothing due to transactions
      console.error('❌ Failed to save themes to UseCase table (Bulk Operation Rolled Back):', error);
      errorCount = themes.length; // Mark all as errored if transaction fails
      return { savedCount: 0, errorCount };
    }
  }
  
  private generateNewUseCasesPrompt(chat: GroupedChat): string {
    return `Analyze the following chat conversations and identify sequential themes or topics.
  
CRITICAL REQUIREMENT: You MUST include EVERY SINGLE MESSAGE ID in your analysis. Not a single message ID can be left out.
  
For each chat:
1. Identify separate themes or topics within the conversation
2. Each theme should be a sequential segment - if a topic returns later in the conversation, treat it as a new theme
3. IMPORTANT: EVERY message MUST be assigned to a theme - even if you need to create a single-message theme for isolated messages
4. For each theme, provide:
   - A theme type that best describes the nature of the conversation (e.g., REQUEST, QUESTION, HELP)
   - A concise title describing the specific query
   - A short description with concrete details about what was discussed
   - A general topic describing the topic e.g. Finance, Legal, HR, etc.
   - The time saved by using the query, a rough estimate of how long it would have taken the user to do it without the query
   - All message IDs that belong to this theme (in sequential order)
  
Theme Types Examples (you can use these or create your own that best fit the conversation):
${THEME_TYPE_EXAMPLES.join(", ")}
  
Examples of what these types might represent:
- REQUEST: When user asks for specific information or help
- DISCUSSION: General conversation about a topic
- QUESTION: Specific questions about something
- HELP: User asking for assistance with a problem
- ISSUE: User reporting a problem or challenge
- FEEDBACK: User providing opinions or feedback
- GREETING: Initial greetings or farewells
- OTHER: Use for any message that doesn't fit other categories
  
VERIFICATION REQUIREMENT:
- Check your response before finalizing - count all message IDs in the input and ensure the same number appears in your output
- For standalone messages (like greetings, acknowledgments, thank yous, etc.), create appropriate short themes
- Your analysis will be checked against the original message list for 100% coverage
  
Your response must be valid JSON following this exact schema:
{
  "analysis": {
    "summary": "summary of the chat",
  },
  "mainTheme": {
    "type": "type of the main theme",
    "topic": "topic of the main theme"
  },
  "chats": [
  {
    "chatId": "id of the chat",
      "themes": [
        {
          "type": "REQUEST",
          "title": "PDF to PNG conversion", 
          "description": "User needed help converting PDF files to PNG format",
          "topic": "FileConversion",
          "timeSaved": "4 minutes",
          "messageIds": ["msg-id-1", "msg-id-2", "msg-id-3"]
        },
        {
          "type": "DISCUSSION",
          "title": "Politics and economics",
          "description": "Conversation about current political climate",
          "topic": "Politics",
          "timeSaved": "10 minutes",
          "messageIds": ["msg-id-4", "msg-id-5"]
        }
      ]
    }
  ]
}
  
Here are the conversations to analyze. Pay careful attention to message IDs:
  
CHAT ID: ${chat.chatId}\n${chat.messages.map(msg => 
  `MESSAGE ID: ${msg.id}\n
  ROLE: ${msg.role}\n${msg.agentType ? `AGENT TYPE: ${msg.agentType}\n` : ''}
  ${msg.inputTokens ? `INPUT TOKENS: ${msg.inputTokens}\n` : ''}
  ${msg.outputTokens ? `OUTPUT TOKENS: ${msg.outputTokens}\n` : ''}
  CONTENT: ${msg.parts?.toString().substring(0, 1000)}${msg.parts?.toString() ? msg.parts?.toString().length > 1000 ? '...[truncated]' : '' : ''}\n`
).join('\n')}`;
  }
  
  private async processChunksInParallel(
    chats: GroupedChat[], 
    concurrencyLimit: number,
    onProgress?: () => void
  ): Promise<{ 
    results: AIResponse[], 
    mergedChatIds: string[] 
  }> {
    
    const results: AIResponse[] = [];
    const mergedChatIds: string[] = [];
    const chatQueue = [...chats];
    let processedCount = 0; // Use a shared counter
    const totalChats = chats.length;
    const workerPromises: Promise<void>[] = [];
    
    // Create worker IDs array [0, 1, 2, ..., concurrencyLimit-1]
    const workers = Array.from({ length: concurrencyLimit }, (_, i) => i);
  
    // Process a single chat - Modify to increment shared counter
    const processSingleChat = async (chat: GroupedChat): Promise<void> => {
      let success = false;
      try {
        const { results: chatResults, mergedChatIds: chatMergedIds } = await this.processChat(chat);
        // Ensure results are added atomically if needed, though push might be okay here
        results.push(...chatResults);
        mergedChatIds.push(...chatMergedIds);
        success = true;
      } catch (error) {
        console.error(`Failed to process chat ${chat.chatId}:`, error);
        // Decide how to handle errors, maybe collect failed IDs
      } finally {
        // Increment count regardless of success/failure for progress tracking
        const currentCount = ++processedCount;
        // Call progress callback if provided
        if (onProgress) {
          // Ensure progress is reported based on the incremented count
          onProgress(); 
        }
      }
    };
  
    // Assign work to a worker
    const assignWork = async (workerId: number): Promise<void> => {
      // Keep assigning work as long as there are chats in the queue
      while (chatQueue.length > 0) {
        const chat = chatQueue.shift(); // Take a chat from the queue
        if (!chat) continue; // Should not happen if length > 0, but good practice

        try {
          await processSingleChat(chat); // Process the chat
        } catch (error) {
          // Errors within processSingleChat are logged there, 
          // but we catch potential errors in the loop structure itself
          console.error(`Worker ${workerId} encountered unexpected error processing chat ${chat.chatId}:`, error);
        }
      } // Loop continues until chatQueue is empty
    };

    // Start all workers and collect their promises
    workers.forEach(workerId => {
      workerPromises.push(assignWork(workerId));
    });

    // Wait for all workers to finish processing the entire queue
    await Promise.all(workerPromises);

    return { results, mergedChatIds };
  }
} 