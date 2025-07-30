// Main Orchestrator
import { UseCaseGenerationOrchestrator } from './orchestrator';

// Types
import type { 
  GenerationSummary,
  GenerationProgress,
} from './types';

// Interfaces (exposed for dependency injection and testing)
import type {
  IUseCaseGenerationOrchestrator,
  IMessageFetcher,
  IUseCaseTriageService,
  IUseCaseMerger,
  IThemeGenerator,
  IUseCaseCategorizer
} from './interfaces';

// Create and export the default instance
const defaultOrchestrator = new UseCaseGenerationOrchestrator();

/**
 * Generate top use cases - Main entry point to the use case generation pipeline
 * This function is a direct proxy to the default orchestrator's generateTopUseCases method.
 * 
 * @param sortBy Criteria for sorting the generated use cases ('timeSaved' or 'chatCount')
 * @param progressCallback Optional callback to report progress for UI updates
 * @returns A summary of the generation process with counts of various operations
 */
export async function generateTopUseCases(
  sortBy: 'timeSaved' | 'chatCount' = 'timeSaved',
  progressCallback?: (progress: GenerationProgress) => void
): Promise<GenerationSummary> {
  return defaultOrchestrator.generateTopUseCases(sortBy, progressCallback);
}

// Export types and interfaces for consumers
export { UseCaseGenerationOrchestrator };
export type { 
  GenerationSummary, 
  GenerationProgress,
  IUseCaseGenerationOrchestrator,
  IMessageFetcher,
  IUseCaseTriageService,
  IUseCaseMerger,
  IThemeGenerator,
  IUseCaseCategorizer
}; 