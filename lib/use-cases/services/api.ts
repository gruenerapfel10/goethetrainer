// lib/use-cases/services/api.ts
import type { TopUseCaseCategory, Message } from '@/components/dashboard/top-use-cases/common/types';

const CATEGORY_API_URL = '/api/use-case-categories';
const MESSAGES_API_URL = '/api/messages';
const CHATS_API_URL = '/api/chats';

interface ApiErrorData {
  message?: string;
}

class ApiError extends Error {
  status: number;
  data: ApiErrorData;

  constructor(message: string, status: number, data: ApiErrorData = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiErrorData = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Ignore if response body is not JSON
    }
    throw new ApiError(
      errorData.message || `HTTP error! Status: ${response.status}`, 
      response.status, 
      errorData
    );
  }
  return response.json() as Promise<T>;
}

export interface FetchCategoriesParams {
  page: number;
  limit: number;
  query: string;
  filter: 'all' | 'categories';
}

export interface FetchCategoriesResponse {
  categories: TopUseCaseCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchCategoriesAPI(params: FetchCategoriesParams): Promise<FetchCategoriesResponse> {
  const { page, limit, query, filter } = params;
  
  // Create URL search params
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    searchFilter: filter
  });
  
  // Only add search query if it's not empty
  if (query && query.trim() !== '') {
    searchParams.append('searchQuery', query);
  }

  const response = await fetch(`${CATEGORY_API_URL}?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status}`);
  }

  return response.json();
}

export interface FetchMessagesResponse {
  messages: Message[];
  useCaseId: string;
}

export interface FetchChatMessagesResponse {
  messages: Message[];
  chatId: string;
}

/**
 * Fetch messages for a specific use case
 * @param useCaseId - The ID of the use case
 * @returns Promise with the messages data
 */
export async function fetchUseCaseMessagesAPI(useCaseId: string): Promise<FetchMessagesResponse> {
  const response = await fetch(`${MESSAGES_API_URL}?useCaseId=${useCaseId}`);
  return handleApiResponse<FetchMessagesResponse>(response);
}

/**
 * Fetch all messages for a chat
 * @param chatId - The ID of the chat
 * @returns Promise with the chat messages data
 */
export async function fetchChatMessagesAPI(chatId: string): Promise<FetchChatMessagesResponse> {
  const response = await fetch(`${MESSAGES_API_URL}?chatId=${chatId}`);
  return handleApiResponse<FetchChatMessagesResponse>(response);
}