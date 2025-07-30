import type { 
  IUseCaseGenerationOrchestrator, 
  IMessageFetcher, 
  IUseCaseTriageService, 
  IUseCaseMerger, 
  IThemeGenerator, 
  IUseCaseCategorizer, 
  IGenerationStage 
} from './interfaces';
import type { 
  GenerationContext, 
  GenerationProgress, 
  GenerationSummary 
} from './types';
import { 
  FetchAndGroupStage, 
  TriageMessagesStage, 
  MergeMessagesStage, 
  GenerateThemesStage, 
  CategorizeUseCasesStage 
} from './stages';
import {
  MessageFetcherService,
  UseCaseTriageService,
  UseCaseMergerService,
  ThemeGeneratorService,
  UseCaseCategorizerService
} from './services';
import { createGenerationSummary, logSummary } from './utils';

export class UseCaseGenerationOrchestrator implements IUseCaseGenerationOrchestrator {
  private stages: IGenerationStage[];
  private TOTAL_STAGES: number;
  
  constructor(
    private messageFetcher: IMessageFetcher = new MessageFetcherService(),
    private triageService: IUseCaseTriageService = new UseCaseTriageService(),
    private mergerService: IUseCaseMerger = new UseCaseMergerService(),
    private themeGenerator: IThemeGenerator = new ThemeGeneratorService(),
    private categorizerService: IUseCaseCategorizer = new UseCaseCategorizerService()
  ) {
    // Initialize pipeline stages
    this.stages = [
      new FetchAndGroupStage(messageFetcher),
      new TriageMessagesStage(triageService),
      new MergeMessagesStage(mergerService),
      new GenerateThemesStage(themeGenerator),
      new CategorizeUseCasesStage(categorizerService)
    ];
    
    this.TOTAL_STAGES = this.stages.length;
  }
  
  async generateTopUseCases(
    sortBy: 'timeSaved' | 'chatCount' = 'timeSaved',
    progressCallback?: (progress: GenerationProgress) => void
  ): Promise<GenerationSummary> {
    
    const processStartTime = Date.now();
    const stageTimings: Record<string, number> = {};
    
    // Initialize context
    const context: GenerationContext = {
      // Input parameters
      sortBy,
      progressCallback,
      
      // Data containers
      unprocessedMessages: [],
      processedChats: [],
      uniqueChatIds: [],
      useCasesMap: new Map(),
      chatsToGenerateThemes: [],
      messagesToMerge: [],
      aiResults: [],
      processedChatIds: [],
      
      // Counters for summary
      totalMessagesProcessed: 0,
      newUseCasesCreatedCount: 0,
      assignedToExistingCount: 0,
      assignedToNewCount: 0,
      newCategoriesCreatedCount: 0,
      mergedMessagesCount: 0,
      
      // Stage tracking
      currentStage: 1,
      totalStages: this.TOTAL_STAGES,
      
      // Report progress function - THIS FUNCTION WILL BE OVERRIDDEN
      reportProgress: () => {}
    };
    
    // Define the actual reportProgress function on updatedContext
    let updatedContext = { ...context };
    
    // Define the simplified reportProgress function
    updatedContext.reportProgress = (stageName: string, details?: string) => {
      if (progressCallback) {
        const currentTime = Date.now();
        const stageStartTime = updatedContext.stageStartTime || processStartTime;
        const stageElapsedTime = currentTime - stageStartTime;
        const totalElapsedTime = currentTime - processStartTime;
        
        // Determine progress percentage based on completed stages
        const progressPercentage = updatedContext.statusIndicator === 'complete' ? 100 :
          Math.round(((updatedContext.currentStage - 1) / updatedContext.totalStages) * 100);
        
        progressCallback({
          stage: updatedContext.currentStage,
          totalStages: updatedContext.totalStages,
          stageName,
          details,
          progressPercentage,
          statusIndicator: updatedContext.statusIndicator || 'processing',
          metrics: updatedContext.metrics,
          timing: {
            stageStartTime,
            stageElapsedTime,
            totalElapsedTime,
            averageItemProcessTime: updatedContext.averageItemProcessTime
          }
        });
      }
    };
    
    try {
      // Process each stage
      let stageIndex = 0;
      
      for (const stage of this.stages) {
        // Update stage index
        stageIndex++;
        updatedContext.currentStage = stageIndex;
        updatedContext.stageStartTime = Date.now();
        updatedContext.statusIndicator = 'processing';
           
        // Report start of the stage
        updatedContext.reportProgress(stage.stageName, `Starting ${stage.stageName}...`);
        
        // Execute the stage
        const stageExecuteStartTime = Date.now();
        updatedContext = await stage.execute(updatedContext);
        const stageDuration = Date.now() - stageExecuteStartTime;
        stageTimings[stage.stageName] = stageDuration;
        
        // Check for early exit conditions
        if (stageIndex === 1 && updatedContext.unprocessedMessages.length === 0) {
          // Report the abort
          updatedContext.statusIndicator = 'warning';
          updatedContext.reportProgress(stage.stageName, "No messages to process, aborting.");
          break; 
        }
        
        // Mark stage as complete
        updatedContext.statusIndicator = 'success';
        updatedContext.reportProgress(`${stage.stageName} - Complete`, `Stage completed in ${(stageDuration / 1000).toFixed(2)}s`);
      }
      
      // Calculate total processing time
      const totalProcessingTime = Date.now() - processStartTime;
      
      // Create summary
      const summary = createGenerationSummary({
        totalMessagesProcessed: updatedContext.totalMessagesProcessed,
        newUseCasesCreatedCount: updatedContext.newUseCasesCreatedCount,
        assignedToExistingCount: updatedContext.assignedToExistingCount,
        assignedToNewCount: updatedContext.assignedToNewCount,
        newCategoriesCreatedCount: updatedContext.newCategoriesCreatedCount,
        mergedMessagesCount: updatedContext.mergedMessagesCount,
        processingTime: {
          total: totalProcessingTime,
          byStage: stageTimings
        }
      });
      
      // Signal completion
      if (progressCallback) {
        updatedContext.statusIndicator = 'complete';
        updatedContext.reportProgress('Complete', 'All processing complete');
      }
      
      // Log summary
      logSummary(summary);
      
      return summary;
    } catch (error) {
      // Handle errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ CRITICAL ERROR in generateTopUseCases:', error);
      
      // Report error
      if (progressCallback) {
        progressCallback({
          stage: -1,
          totalStages: this.TOTAL_STAGES,
          stageName: 'Error',
          details: 'An error occurred during processing',
          error: errorMessage,
          statusIndicator: 'error',
          timing: {
            totalElapsedTime: Date.now() - processStartTime,
            stageStartTime: updatedContext.stageStartTime || processStartTime,
            stageElapsedTime: updatedContext.stageStartTime ? Date.now() - updatedContext.stageStartTime : 0
          }
        });
      }
      
      // Return error summary
      return {
        totalMessagesProcessed: updatedContext.totalMessagesProcessed,
        savedCount: updatedContext.newUseCasesCreatedCount,
        assignedToExistingCount: updatedContext.assignedToExistingCount,
        assignedToNewCount: updatedContext.assignedToNewCount,
        newCategoriesCount: updatedContext.newCategoriesCreatedCount,
        mergedMessagesCount: updatedContext.mergedMessagesCount,
        processingTime: {
          total: Date.now() - processStartTime,
          byStage: stageTimings
        },
        error: errorMessage
      };
    }
  }
} 