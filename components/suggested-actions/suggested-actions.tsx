'use client';

import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { memo, useEffect, useState } from 'react';
import { defaultSuggestions } from './defaultConfig';
import { Skeleton } from '../ui/skeleton';

// Action suggestion data type
export interface SuggestedAction {
  title: string;
  label: string;
  action: string;
}

interface SuggestedActionsProps {
  chatId: string;
  selectedModelId: string;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
}

function PureSuggestedActions({
  chatId,
  selectedModelId,
  append,
}: SuggestedActionsProps) {
  const [messages, setMessages] = useState<SuggestedAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSuggestedMessages() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/suggested-messages?modelId=${selectedModelId}`,
        );

        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        } else {
          // Fallback to default suggestions if API fails
          const fallbackMessages = defaultSuggestions[selectedModelId] || [];
          setMessages(fallbackMessages);
        }
      } catch (error) {
        console.error('Failed to fetch suggested messages:', error);
        // Fallback to default suggestions if API fails
        const fallbackMessages = defaultSuggestions[selectedModelId] || [];
        setMessages(fallbackMessages);
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestedMessages();
  }, [selectedModelId]);

  // Early return for SharePoint agents - no suggestions needed
  if (selectedModelId === 'sharepoint-agent' || selectedModelId === 'sharepoint-agent-v2') {
    return null;
  }

  // Limit the number of messages to show (between 1 and 4)
  const displayMessages = messages.slice(0, 4);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-2 w-full">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className={index > 1 ? 'hidden sm:block' : 'block'}
          >
            <div className="border rounded-xl px-4 py-3.5 h-auto w-full">
              <Skeleton className="h-5 w-[120px] bg-muted mb-2" />
              <Skeleton className="h-4 w-[180px] bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayMessages.length === 0) {
    return null;
  }

  return (
    <div className="grid sm:grid-cols-2 gap-2 w-full">
      {displayMessages.map((message, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              append({
                role: 'user',
                content: message.action,
              });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start flex-wrap text-wrap"
          >
            <span className="font-medium">{message.title}</span>
            <span className="text-muted-foreground">{message.label}</span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

// Using memo to prevent unnecessary re-renders
export const SuggestedActions = memo(PureSuggestedActions);