import type { 
  IGenerationStage, 
  IMessageFetcher, 
  IUseCaseTriageService, 
  IUseCaseMerger, 
  IThemeGenerator, 
  IUseCaseCategorizer 
} from './interfaces';
import type { GenerationContext } from './types';

/**
 * First stage: Fetch and group unprocessed messages
 * 
 * Basically gets all the relevant data we need and updates the main context
 * for other stages
 */
export class FetchAndGroupStage implements IGenerationStage {
  readonly stageName = 'Fetching and grouping messages';
  
  constructor(private messageFetcher: IMessageFetcher) {}
  
  async execute(context: GenerationContext): Promise<GenerationContext> {
    // Set initial stage status
    context.statusIndicator = 'processing';
    context.stageStartTime = Date.now();

    // Report starting
    context.reportProgress(this.stageName, 'Starting message fetch and analysis');

    // Fetch messages
    context.reportProgress(this.stageName, 'Retrieving unprocessed messages from database');
    const unprocessedMessages = await this.messageFetcher.fetchUnprocessedMessages();

    // Group messages by chat
    context.reportProgress(this.stageName, 'Analyzing message patterns');
    const processedChats = this.messageFetcher.groupMessagesByChat(unprocessedMessages);
    
    // Get unique chat IDs
    context.reportProgress(this.stageName, 'Identifying unique conversations');
    const uniqueChatIds = [...new Set(processedChats.map(c => c.chatId))];
    
    // Get the latest use cases for these chats
    context.reportProgress(this.stageName, 'Retrieving existing use cases for matching');
    const useCasesMap = await this.messageFetcher.getLatestUseCasesForChats(uniqueChatIds);
    
    // Update context
    const updatedContext = {
      ...context,
      unprocessedMessages,
      processedChats,
      uniqueChatIds,
      useCasesMap,
      totalMessagesProcessed: unprocessedMessages.length
    };
    
    // Early exit if no messages found
    if (unprocessedMessages.length === 0) {
      context.statusIndicator = 'warning';
      context.reportProgress(this.stageName, 'No unprocessed messages found');
      return updatedContext;
    }
    
    // Report success
    context.statusIndicator = 'success';
    context.reportProgress(
      this.stageName, 
      `Found ${unprocessedMessages.length} messages across ${uniqueChatIds.length} chats`
    );

    return updatedContext;
  }
}

/**
 * Second stage: Triage messages for merging or new theme generation
 * 
 * Basically, do we merge with existing use case or make new use case?
 */
export class TriageMessagesStage implements IGenerationStage {
  readonly stageName = 'Triaging messages';
  
  constructor(private triageService: IUseCaseTriageService) {}
  
  async execute(context: GenerationContext): Promise<GenerationContext> {
    // Set initial stage status
    context.statusIndicator = 'processing';
    context.stageStartTime = Date.now();
    
    // Report starting
    context.reportProgress(this.stageName, 'Initializing message triage system');
    
    // Skip if no messages
    if (context.processedChats.length === 0) {
      context.reportProgress(this.stageName, 'No messages to triage');
      return context;
    }
    
    context.reportProgress(this.stageName, 'Analyzing messages for merging or new generation');
    
    // Triage the messages
    const {
      chatsToGenerateThemes,
      messagesToMerge
    } = await this.triageService.triageForProcessing(
      context.processedChats,
      context.useCasesMap
    );
    
    // Update context
    const updatedContext = {
      ...context,
      chatsToGenerateThemes,
      messagesToMerge
    };
    
    // Report success
    context.reportProgress(
      this.stageName, 
      `Identified ${chatsToGenerateThemes.length} chats for new themes and ${messagesToMerge.length} merge groups`
    );
    
    return updatedContext;
  }
}

/**
 * Third stage: Merge messages into existing use cases
 * 
 * Basically updates db for messagesToMerge
 */
export class MergeMessagesStage implements IGenerationStage {
  readonly stageName = 'Merging messages';
  
  constructor(private mergerService: IUseCaseMerger) {}
  
  async execute(context: GenerationContext): Promise<GenerationContext> {
    // Set initial stage status
    context.statusIndicator = 'processing';
    context.stageStartTime = Date.now();
    
    // Report starting
    context.reportProgress(this.stageName, 'Merging messages into existing use cases');
    
    // Skip if no messages to merge
    if (context.messagesToMerge.length === 0) {
      context.reportProgress(this.stageName, 'No messages to merge');
      return context;
    }
    
    // Merge messages into existing use cases
    const mergedMessagesCount = await this.mergerService.mergeMessagesIntoUseCases(
      context.messagesToMerge
    );
    
    // Update context
    const updatedContext = {
      ...context,
      mergedMessagesCount
    };
    
    // Report success
    context.reportProgress(
      this.stageName, 
      `Merged ${mergedMessagesCount} messages into existing use cases`
    );
    
    return updatedContext;
  }
}

/**
 * Fourth stage: Generate and save themes
 * 
 * Basically generates the use cases for chatsToGenerateThemes
 */
export class GenerateThemesStage implements IGenerationStage {
  readonly stageName = 'Generating themes';
  
  constructor(private themeGenerator: IThemeGenerator) {}
  
  async execute(context: GenerationContext): Promise<GenerationContext> {
    // Set initial stage status
    context.statusIndicator = 'processing';
    context.stageStartTime = Date.now();
    
    // Report starting
    context.reportProgress(this.stageName, 'Analyzing chats to identify usage patterns');
    
    // Skip if no chats to generate themes for
    if (context.chatsToGenerateThemes.length === 0) {
      context.statusIndicator = 'success';
      context.reportProgress(this.stageName, 'No chats to generate themes for');
      return {
        ...context,
        newUseCasesCreatedCount: 0,
        processedChatIds: []
      };
    }

    // Generate and save themes
    const { 
      newUseCasesCount, 
      processedChatIds 
    } = await this.themeGenerator.generateAndSaveThemes(
      context.chatsToGenerateThemes,
      (details) => context.reportProgress(this.stageName, details)
    );
    
    // Update context with correct status type
    const updatedContext: GenerationContext = {
      ...context,
      newUseCasesCreatedCount: newUseCasesCount,
      processedChatIds,
      statusIndicator: 'success' as const
    };
    
    // Report completion
    context.reportProgress(this.stageName, `Generated and saved ${newUseCasesCount} new use cases`);
    
    return updatedContext;
  }
}

/**
 * Fifth stage: Categorize use cases
 */
export class CategorizeUseCasesStage implements IGenerationStage {
  readonly stageName = 'Categorizing use cases';
  
  constructor(private categorizerService: IUseCaseCategorizer) {}
  
  async execute(context: GenerationContext): Promise<GenerationContext> {
    // Set initial stage status
    context.statusIndicator = 'processing';
    context.stageStartTime = Date.now();
    
    // Report starting
    context.reportProgress(this.stageName, 'Creating and assigning categories');
    
    // Categorize use cases with standard progress reporting
    const categorization = await this.categorizerService.categorizeUseCases(
      (progress, details) => context.reportProgress(this.stageName, details)
    );
    
    // Update context with correct status type
    const updatedContext: GenerationContext = {
      ...context,
      assignedToExistingCount: categorization.assignedToExisting,
      assignedToNewCount: categorization.assignedToNew,
      newCategoriesCreatedCount: categorization.newCategories,
      statusIndicator: 'success' as const
    };
    
    // Report completion
    context.reportProgress(
      this.stageName, 
      `Assigned ${categorization.assignedToExisting} to existing and ${categorization.assignedToNew} to new categories`
    );
    
    return updatedContext;
  }
} 