import { z } from 'zod/v3';
import type {DBMessage} from "@/lib/db/schema";
import { jsonrepair } from 'jsonrepair'

// ----- Constants -----

export const AllowedAgentTypes = ['assistant','general-bedrock-agent', 'sharepoint-agent', 'sharepoint-agent-v2', 'websearch-agent', 'text2sql-agent'] as const;
export type AgentType = typeof AllowedAgentTypes[number];

// ----- Core Data Types -----

export interface GroupedChat {
  chatId: string;
  processed?: boolean | null;
  messages: Array<DBMessage>;
}

export interface MessageMergeInfo {
  chatId: string;
  useCaseId: string;
  messages: any[];
}

export interface AIResponseTheme {
  type: string;
  title: string;
  description: string;
  topic: string;
  timeSaved: string;
  messageIds: string[];
}

export interface AIResponse {
  chatId: string;
  themes: AIResponseTheme[];
}

// ----- Progress and Results -----

export interface GenerationProgress {
  stage: number;
  totalStages: number;
  stageName: string;
  details?: string;
  error?: string;
  subStage?: {
    current: number;
    total: number;
    name: string;
  };
  metrics?: {
    processedItems: number;
    totalItems?: number;
    successRate?: number;
    processingSpeed?: number; // items per second
    estimatedTimeRemaining?: number; // in seconds
    batchesCompleted?: number;
    batchesTotal?: number;
  };
  timing?: {
    stageStartTime: number;
    stageElapsedTime: number; // in milliseconds
    totalElapsedTime: number; // in milliseconds
    averageItemProcessTime?: number; // in milliseconds
  };
  statusIndicator?: 'idle' | 'processing' | 'success' | 'warning' | 'error' | 'complete';
  progressPercentage?: number; // calculated percentage 0-100
}

export interface GenerationSummary {
  totalMessagesProcessed: number;
  savedCount: number;          
  assignedToExistingCount: number;
  assignedToNewCount: number;
  newCategoriesCount: number;
  mergedMessagesCount?: number;
  processingTime?: {
    total: number; // in milliseconds
    byStage: Record<string, number>; // stageName -> time in milliseconds
  };
  error?: string;
}

export interface CategorizationResult {
  assignedToExisting: number;
  assignedToNew: number;
  newCategories: number;
  error?: string;
}

// ----- Service Context -----

export interface GenerationContext {
  // Input parameters
  sortBy: 'timeSaved' | 'chatCount';
  progressCallback?: (progress: GenerationProgress) => void;
  
  // Data containers
  unprocessedMessages: any[]; // Raw messages from DB
  processedChats: GroupedChat[];
  uniqueChatIds: string[];
  useCasesMap: Map<string, any>;
  chatsToGenerateThemes: any[];
  messagesToMerge: any[];
  aiResults: any[];
  processedChatIds: string[];
  
  // Counters for summary
  totalMessagesProcessed: number;
  newUseCasesCreatedCount: number;
  assignedToExistingCount: number;
  assignedToNewCount: number;
  newCategoriesCreatedCount: number;
  mergedMessagesCount: number;
  
  // Stage tracking
  currentStage: number;
  totalStages: number;
  stageStartTime?: number;
  statusIndicator?: 'processing' | 'success' | 'error' | 'warning' | 'complete';
  subStageProgress?: number;
  currentSubStage?: {
    current: number;
    total: number;
    name: string;
  };
  metrics?: {
    processedItems: number;
    totalItems: number;
    successRate: number;
    processingSpeed: number;
    estimatedTimeRemaining: number;
  };
  averageItemProcessTime?: number;
  
  // Progress reporting
  reportProgress: (stageName: string, details?: string) => void;
}

// ----- AI Schemas -----

export const aiResponseSchema = z.object({
  chats: z.union([
    z.array(z.object({
      chatId: z.string(),
      themes: z.array(z.object({
        type: z.string(),
        title: z.string(),
        description: z.string(),
        topic: z.string(),
        timeSaved: z.string(),
        messageIds: z.union([
          z.array(z.string()),
          z.string().transform((str) => {
            try {
              const parsed = JSON.parse(str);
              const result = Array.isArray(parsed) ? parsed : [str];
              return result;
            } catch (error) {
              return [str];
            }
          })
        ])
      }))
    })),
    z.string().transform((str) => {
      try {
        const repaired = jsonrepair(str);
        const parsed = JSON.parse(repaired);
        const result = Array.isArray(parsed) ? parsed : [str];
        return result;
      } catch (error) {
        return [str];
      }
    })
  ])
});

export const mergeDecisionSchema = z.object({
  shouldMerge: z.boolean().describe("True if the new messages are a direct semantic continuation of the existing use case messages, false if they start a new distinct topic.")
}); 