import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

// Create and export the db client to be used by all services
const client = postgres(process.env.POSTGRES_URL!);
export const db = drizzle(client);

/**
 * Utility to retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param retries - Number of retries (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @param factor - Exponential factor (default: 2)
 * @returns Result of the function
 * @throws Last error after all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 1000,
  factor = 2
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === retries) {
        break; // Last attempt failed, exit loop
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(factor, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Creates a summary of the generation process
 */
export function createGenerationSummary({
  totalMessagesProcessed,
  newUseCasesCreatedCount,
  assignedToExistingCount,
  assignedToNewCount,
  newCategoriesCreatedCount,
  mergedMessagesCount,
  processingTime
}: {
  totalMessagesProcessed: number;
  newUseCasesCreatedCount: number;
  assignedToExistingCount: number;
  assignedToNewCount: number;
  newCategoriesCreatedCount: number;
  mergedMessagesCount: number;
  processingTime?: {
    total: number;
    byStage: Record<string, number>;
  };
}) {
  return {
    totalMessagesProcessed,
    savedCount: newUseCasesCreatedCount,
    assignedToExistingCount,
    assignedToNewCount,
    newCategoriesCount: newCategoriesCreatedCount,
    mergedMessagesCount,
    processingTime
  };
}

/**
 * Creates an empty generation summary for when no messages are processed
 */
export function createEmptySummary() {
  return {
    totalMessagesProcessed: 0, 
    savedCount: 0, 
    assignedToExistingCount: 0, 
    assignedToNewCount: 0, 
    newCategoriesCount: 0, 
    mergedMessagesCount: 0
  };
}

/**
 * Logs the generation summary to the console
 */
export function logSummary(summary: any): void {
  const logItems = [
    ['📨 Initial Unprocessed Messages Found', summary.totalMessagesProcessed],
    ['✨ New Use Cases Created & Saved', summary.savedCount],
    ['🔄 Messages Merged into Existing Use Cases', summary.mergedMessagesCount],
    ['🏷️ Use Cases Assigned to Existing Categories', summary.assignedToExistingCount],
    ['🏷️ Use Cases Assigned to New Categories', summary.assignedToNewCount],
    ['🆕 New Categories Created', summary.newCategoriesCount]
  ];

  logItems.forEach(([label, value]) => console.log(`   ${label}: ${value}`));
  
  // Log processing time if available
  if (summary.processingTime) {
    
    // Log time by stage if available
    if (summary.processingTime.byStage) {
      Object.entries(summary.processingTime.byStage).forEach(([stage, timeMs]) => {
        console.log(`      - ${stage}: ${(timeMs as number / 1000).toFixed(2)}s`);
      });
    }
  }
  
} 