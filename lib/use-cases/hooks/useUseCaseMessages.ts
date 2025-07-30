import { useState, useCallback } from 'react';
import type { UseCase, Message } from '@/components/dashboard/top-use-cases/common/types';
import { fetchUseCaseMessagesAPI, fetchChatMessagesAPI } from '../services/api';

// Message cache to avoid unnecessary fetches
const messageCache = new Map<string, { 
  data: Message[],
  timestamp: number
}>();

const fullChatCache = new Map<string, {
  data: Message[],
  timestamp: number
}>();

// Cache timeout - 5 minutes
const CACHE_TIMEOUT = 5 * 60 * 1000;

interface UseUseCaseMessagesReturn {
  messages: Message[];
  fullChatMessages: Message[];
  isLoading: boolean;
  error: Error | null;
  showFullChat: boolean;
  fetchUseCaseMessages: (useCaseId: string) => Promise<void>;
  fetchFullChatMessages: (chatId: string, useCaseId: string) => Promise<void>;
  toggleFullChat: (useCase: UseCase) => void;
  resetState: () => void;
  clearCache: () => void;
}

export function useUseCaseMessages(): UseUseCaseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [fullChatMessages, setFullChatMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [showFullChat, setShowFullChat] = useState(false);

  // Fetch messages for a specific use case
  const fetchUseCaseMessages = useCallback(async (useCaseId: string) => {
    // Check cache first
    const cachedData = messageCache.get(useCaseId);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TIMEOUT) {
      setMessages(cachedData.data);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchUseCaseMessagesAPI(useCaseId);
      
      // Process and store messages
      const messagesArray = Array.isArray(data.messages) ? data.messages : [];
      setMessages(messagesArray);
      
      // Cache the result
      messageCache.set(useCaseId, {
        data: messagesArray,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('[useUseCaseMessages] Error fetching messages:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch full chat messages
  const fetchFullChatMessages = useCallback(async (chatId: string, useCaseId: string) => {
    // If we don't have use case messages yet, fetch them first
    if (messages.length === 0) {
      await fetchUseCaseMessages(useCaseId);
    }
    
    // Check cache for full chat messages
    const cacheKey = `chat-${chatId}`;
    const cachedChat = fullChatCache.get(cacheKey);
    if (cachedChat && Date.now() - cachedChat.timestamp < CACHE_TIMEOUT) {
      setFullChatMessages(cachedChat.data);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchChatMessagesAPI(chatId);
      
      // Process and store messages
      const messagesArray = Array.isArray(data.messages) ? data.messages : [];
      setFullChatMessages(messagesArray);
      
      // Cache the result
      fullChatCache.set(cacheKey, {
        data: messagesArray,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('[useUseCaseMessages] Error fetching chat messages:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [messages.length, fetchUseCaseMessages]);

  // Toggle between showing just use case messages or the full chat
  const toggleFullChat = useCallback((useCase: UseCase) => {
    setShowFullChat(prev => {
      const newState = !prev;
      
      // If turning on full chat view and we have a chat ID, fetch full chat messages
      if (newState && useCase.chatId && fullChatMessages.length === 0) {
        fetchFullChatMessages(useCase.chatId, useCase.id);
      }
      
      return newState;
    });
  }, [fullChatMessages.length, fetchFullChatMessages]);

  // Reset state when modal closes
  const resetState = useCallback(() => {
    setShowFullChat(false);
    // Keep cached messages in memory but clear component state
    setMessages([]);
    setFullChatMessages([]);
    setError(null);
  }, []);

  // Clear all caches
  const clearCache = useCallback(() => {
    messageCache.clear();
    fullChatCache.clear();
  }, []);

  return {
    messages,
    fullChatMessages,
    isLoading,
    error,
    showFullChat,
    fetchUseCaseMessages,
    fetchFullChatMessages,
    toggleFullChat,
    resetState,
    clearCache
  };
} 