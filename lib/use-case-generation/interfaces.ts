import type { 
  GenerationContext, 
  GenerationProgress, 
  GenerationSummary, 
  GroupedChat, 
  MessageMergeInfo,
} from './types';

/**
 * Interface for a stage in the use case generation pipeline
 */
export interface IGenerationStage {
  /**
   * Name of the stage for logging and progress reporting
   */
  readonly stageName: string;
  
  /**
   * Execute the stage operations
   * @param context The shared generation context
   * @returns A Promise resolving to the updated generation context
   */
  execute(context: GenerationContext): Promise<GenerationContext>;
}

/**
 * Interface for the message fetcher service
 */
export interface IMessageFetcher {
  /**
   * Fetch unprocessed messages from the database
   * Only fetches messages with agentType in AllowedAgentTypes: ${AllowedAgentTypes.join(', ')}
   * @returns Raw message records from the database that match the agent type filter
   */
  fetchUnprocessedMessages(): Promise<any[]>;
  
  /**
   * Group messages by chat ID
   * @param messages Raw message records
   * @returns Grouped chat objects
   */
  groupMessagesByChat(messages: any[]): GroupedChat[];
  
  /**
   * Get the latest use cases for a set of chat IDs
   * @param chatIds Array of chat IDs to lookup
   * @returns Map of chat ID to use case
   */
  getLatestUseCasesForChats(chatIds: string[]): Promise<Map<string, any>>;
}

/**
 * Interface for the triage service
 */
export interface IUseCaseTriageService {
  /**
   * Analyzes messages to determine which should be merged into existing use cases
   * and which should be used to generate new themes
   */
  triageForProcessing(
    processedChats: GroupedChat[],
    useCasesMap: Map<string, any>
  ): Promise<{
    chatsToGenerateThemes: GroupedChat[];
    messagesToMerge: MessageMergeInfo[];
  }>;
  
  /**
   * Determine if a chat should be merged with an existing use case
   * @param chat The chat to check
   * @param existingUseCase The existing use case to potentially merge with
   * @returns True if the chat should be merged, false otherwise
   */
  shouldMergeWithExisting(chat: GroupedChat, existingUseCase: any): Promise<boolean>;
}

/**
 * Interface for the merger service
 */
export interface IUseCaseMerger {
  /**
   * Merge messages into existing use cases
   * @param messagesToMerge Array of message groups to merge
   * @returns The number of messages successfully merged
   */
  mergeMessagesIntoUseCases(messagesToMerge: MessageMergeInfo[]): Promise<number>;
}

/**
 * Interface for the theme generator service
 */
export interface IThemeGenerator {
  /**
   * Generate themes for chats using AI
   * @param chats Chats to generate themes for
   * @param progressCallback Optional callback for progress updates
   * @returns Object containing generated results and affected chat IDs
   */
  generateAndSaveThemes(
    chats: GroupedChat[],
    progressCallback?: (details: string) => void
  ): Promise<{
    newUseCasesCount: number;
    processedChatIds: string[];
  }>;
  
  /**
   * Process a single chat with AI to generate themes or determine merges
   * @param chat The chat to process
   * @returns Generated results and merge decisions
   */
  processChat(chat: GroupedChat): Promise<{
    results: any[];
    mergedChatIds: string[];
  }>;
  
  /**
   * Save generated themes as use cases in the database
   * @param themes The themes to save
   * @param markAsProcessed Whether to mark associated messages as processed
   * @returns Object with counts of saved use cases
   */
  saveThemesToUseCase(
    themes: any[],
    markAsProcessed: boolean
  ): Promise<{
    savedCount: number;
    errorCount: number;
  }>;
}

/**
 * Interface for the categorizer service
 */
export interface IUseCaseCategorizer {
  /**
   * Categorize all uncategorized use cases
   * @param progressCallback Optional callback for progress updates
   * @returns Object with counts of categorizations
   */
  categorizeUseCases(
    progressCallback?: (
      progressPercentage: number,
      details: string,
      subStage?: { current: number; total: number; name: string }
    ) => void
  ): Promise<{
    assignedToExisting: number;
    assignedToNew: number;
    newCategories: number;
    error?: string;
  }>;
}

/**
 * Interface for the main orchestrator
 */
export interface IUseCaseGenerationOrchestrator {
  /**
   * Generate top use cases
   * @param sortBy Criteria for sorting results
   * @param progressCallback Optional callback for progress updates
   * @returns A summary of the generation process
   */
  generateTopUseCases(
    sortBy?: 'timeSaved' | 'chatCount',
    progressCallback?: (progress: GenerationProgress) => void
  ): Promise<GenerationSummary>;
} 