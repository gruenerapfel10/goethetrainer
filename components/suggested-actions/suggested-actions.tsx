import type { UseChatHelpers } from '@ai-sdk/react';

interface SuggestedActionsProps {
  append: UseChatHelpers['append'];
  chatId: string;
  selectedModelId: string;
}

export function SuggestedActions({ append, chatId, selectedModelId }: SuggestedActionsProps) {
  return null; // No suggested actions for now
}