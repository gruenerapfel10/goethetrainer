import type {
  CoreAssistantMessage,
  CoreToolMessage,
  UIMessage,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Document } from '@/lib/db/queries';
import type { FileSearchResult } from '@/components/chat-header';

import { getModelId, getModelCosts } from './costs';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function sanitizeResponseMessages({
  messages,
  reasoning,
}: {
  messages: Array<ResponseMessage>;
  reasoning: string | undefined;
}) {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (typeof message.content === 'string') return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
        ? content.text.length > 0
        : true,
    );

    if (reasoning) {
      // @ts-expect-error: reasoning message parts in sdk is wip
      sanitizedContent.push({ type: 'reasoning', reasoning });
    }

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getMessageIdFromAnnotations(message: UIMessage) {
  // Since annotations are removed, always return the message id
  return message.id;
}

export const extractHostname = (url: string) => {
  const matches = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
  return matches ? matches[1] : null;
};

export const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
};

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

// @deprecated - This function strips experimental_attachments from messages.
// According to the latest Vercel AI SDK documentation, experimental_attachments 
// should be passed directly to streamText, not stripped out.
// Only use this function when you specifically need to remove attachments.
export const messagesWithoutFiles = (messages: any[]) => {
  return messages.map((item) => {
    return { ...item, experimental_attachments: [] };
  });
};

export function calculateModelPricingUSD(usageArray: any[]): number {
  if (!Array.isArray(usageArray)) {
    throw new Error('Input must be an array of usage objects');
  }

  if (usageArray.length === 0) {
    return 0;
  }

  // Calculate cost for each usage object and sum them up
  const totalCost = usageArray.reduce((sum, usage) => {
    const actualModelId = getModelId(usage.modelId);
    const costs = getModelCosts(actualModelId);

    if (!costs) {
      console.warn(`Pricing not found for modelId: ${usage.modelId} (mapped to ${actualModelId})`);
      return sum;
    }

    const input = Number(usage.inputTokens);
    const output = Number(usage.outputTokens);

    if (Number.isNaN(input) || Number.isNaN(output)) {
      throw new Error('Invalid token counts provided');
    }

    const inputCost = (input / 1_000_000) * costs.input;
    const outputCost = (output / 1_000_000) * costs.output;

    return sum + Number((inputCost + outputCost).toFixed(6));
  }, 0);

  // Return total cost rounded to 6 decimal places
  return Number(totalCost.toFixed(6));
}

/**
 * Calculates an approximate token count for a given text.
 * A common approximation is 1 token ~ 4 characters.
 * @param text The input string.
 * @returns The approximate number of tokens.
 */
export function calculateTokens(text: string | null | undefined): number {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.split(" ").length / 4);
}

/**
 * Calculate total prompt tokens including system prompt, messages, and attached files.
 * This version prioritizes accurate file size from metadata for token estimation.
 * @param systemPrompt - The system prompt text
 * @param messages - Array of UI messages
 * @param attachedFiles - Array of attached files with content and size metadata
 * @returns Total approximate token count
 */
export function calculateTotalPromptTokens(
  systemPrompt: string,
  messages: UIMessage[],
  attachedFiles?: FileSearchResult[]
): number {
  let totalTokens = calculateTokens(systemPrompt);

  // Calculate message tokens
  messages.forEach(message => {
    // In AI SDK v5, UIMessage uses parts instead of content
    if (message.parts) {
      message.parts.forEach(part => {
        if (part.type === 'text' && part.text) {
          totalTokens += calculateTokens(part.text);
        }
      });
    }
  });
  
  // Calculate attached files tokens
  if (attachedFiles && attachedFiles.length > 0) {
    attachedFiles.forEach(file => {
      // Prioritize sizeInBytes for accuracy, fall back to excerpt length.
      if (file.sizeInBytes && file.sizeInBytes > 0) {
        totalTokens += Math.ceil(file.sizeInBytes / 4);
      } else {
        totalTokens += calculateTokens(file.content); // Fallback to excerpt
      }
    });
  }
  
  return totalTokens;
}

/**
 * Formats AI response text to ensure proper markdown formatting,
 * especially for bullet points and numbered lists.
 */
export function formatAIResponse(text: string): string {
  // Handle bullet points that are on the same line
  // Match various bullet point styles: •, *, -, ●
  const formatted = text
    // Handle bullet points with • (common in ChatGPT responses)
    .replace(/([^•\n])•\s*/g, '$1\n• ')
    // Ensure there's proper spacing after bullet points
    .replace(/•([^\s])/g, '• $1')
    // Handle numbered lists (e.g., "1. Item 2. Item" -> "1. Item\n2. Item")
    .replace(/(\d+\.\s+[^.]+)(\d+\.)/g, '$1\n$2')
    // Handle asterisk bullets
    .replace(/([^\*\n])\*\s+/g, '$1\n* ')
    // Handle dash bullets
    .replace(/([^-\n])-\s+/g, '$1\n- ')
    // Clean up any double line breaks
    .replace(/\n\n\n+/g, '\n\n')
    // Ensure proper spacing at the start
    .trim();

  return formatted;
}

export const getSources = (messages: UIMessage[], urls: string[]) => {
  // ... existing code ...
};
