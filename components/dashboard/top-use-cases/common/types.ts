import type { UseCaseCategory as DbUseCaseCategory } from '@/lib/db/schema';

// Extend or modify DB type if needed for frontend state
export interface TopUseCaseCategory
  extends Omit<DbUseCaseCategory, 'createdAt' | 'updatedAt'> {
  id: string;
  title: string;
  description: string | null;
  useCaseCount: number;
  relevance: number;
  uniqueUserCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UseCase {
  id: string;
  categoryId: string;
  chatId: string | null;
  title: string;
  description: string | null;
  type: string | null;
  topic: string | null;
  timeSaved: string | null;
  createdAt: string;
  updatedAt: string;
  relevance: number;
}

// Based on getMessagesByUseCaseId query
export interface Message {
  id: string;
  role: string; // 'user' | 'assistant' etc.
  content: any; // The structure depends on how you store message content (e.g., text, objects)
  createdAt: string; // Stored as ISO string, not as Date object
  userEmail: string | null; // From the joined user table
  parts: any; // The structure depends on how you store message parts
}

// Add SearchFilter type definition
export type SearchFilter = 'categories' | 'all';

// Add Message type if needed later
