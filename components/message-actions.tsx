
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';
import { memo, useState, useCallback, useMemo } from 'react';
import equal from 'fast-deep-equal';

import type { Vote } from '@/lib/db/queries';
import { CopyIcon, ThumbDownIcon, ThumbUpIcon, Database } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ExtractResults } from './extract-results';
import { MessageCost } from './message-cost';

// Types for better type safety
interface ExtractedToolResult {
  data?: any;
  summary?: {
    successful: number;
    total: number;
  };
}

interface MessageWithTools {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts?: any[];
}

// Extract data utility with enhanced type safety
const extractDataFromMessage = (message: MessageWithTools): ExtractedToolResult | null => {
  if (!message.parts) return null;

  const extractPart = message.parts.find(
    (part: any) =>
      part.type === 'tool-invocation' &&
      part.toolInvocation?.toolName === 'extract' &&
      part.toolInvocation?.state === 'result' &&
      part.toolInvocation?.result?.data
  );

  return extractPart?.toolInvocation?.result || null;
};

// Vote handler with proper typing
const createVoteHandler = (
  type: 'up' | 'down',
  chatId: string,
  messageId: string,
  mutate: (key: string, updater: (data: Vote[] | undefined) => Vote[], options?: { revalidate: boolean }) => void
) => async (): Promise<void> => {
  const voteRequest = fetch('/api/vote', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatId,
      messageId,
      type,
    }),
  }).then(async (response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData?.code === 'MESSAGE_NOT_FOUND') {
        throw new Error('Please wait for the message to complete before voting.');
      }
      throw new Error(errorData?.error || `Failed to ${type === 'up' ? 'upvote' : 'downvote'} response.`);
    }
    return response;
  });

  toast.promise(voteRequest, {
    loading: `${type === 'up' ? 'Upvoting' : 'Downvoting'} Response...`,
    success: () => {
      mutate(
        `/api/vote?chatId=${chatId}`,
        (currentVotes: Vote[] | undefined): Vote[] => {
          if (!currentVotes) return [];

          const votesWithoutCurrent = currentVotes.filter(
            (vote: Vote) => vote.messageId !== messageId
          );

          const newVote: Vote = {
            chatId,
            messageId,
            isUpvoted: type === 'up',
          };

          return [...votesWithoutCurrent, newVote];
        },
        { revalidate: false }
      );

      return `${type === 'up' ? 'Upvoted' : 'Downvoted'} Response!`;
    },
    error: (err) => err.message || `Failed to ${type === 'up' ? 'upvote' : 'downvote'} response.`,
  });
};

// Component props interface
interface MessageActionsProps {
  chatId: string;
  message: MessageWithTools;
  vote: Vote | undefined;
  isLoading: boolean;
  shouldFetchCost?: boolean;
}

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  shouldFetchCost = false,
}: MessageActionsProps) {
  const { mutate } = useSWRConfig();
  const [, copyToClipboard] = useCopyToClipboard();
  const [extractPopoverOpen, setExtractPopoverOpen] = useState(false);

  // Generate stable key for extract popover
  const extractPopoverKey = useMemo(() => 
    `extract-popover-${message.id}-${chatId}`, 
    [message.id, chatId]
  );

  const handleCopy = useCallback(async (): Promise<void> => {
    const msg = message as any;
    const partsArray = msg.parts || msg.content || [];
    
    // Extract all text parts (excluding tool invocations)
    const textParts = partsArray
      .filter((part: any) => part.type === 'text' && part.text)
      .map((part: any) => part.text);
    
    if (textParts.length > 0) {
      const fullText = textParts.join('\n\n');
      await copyToClipboard(fullText);
      toast.success('Copied to clipboard!');
    }
  }, [message, copyToClipboard]);

  const handleUpvote = useCallback(
    createVoteHandler('up', chatId, message.id, mutate),
    [chatId, message.id, mutate]
  );

  const handleDownvote = useCallback(
    createVoteHandler('down', chatId, message.id, mutate),
    [chatId, message.id, mutate]
  );

  // Memoize extract data to prevent unnecessary recalculations
  const extractData = useMemo(() => 
    extractDataFromMessage(message), 
    [message]
  );

  // Only return null for loading and user messages
  if (isLoading || message.role === 'user') return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2 mt-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={handleCopy}
            >
              <CopyIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={`py-1 px-2 h-fit !pointer-events-auto ${
                vote?.isUpvoted 
                  ? 'bg-foreground text-background hover:bg-foreground/90' 
                  : 'text-muted-foreground'
              }`}
              variant="outline"
              onClick={handleUpvote}
            >
              <ThumbUpIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upvote Response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={`py-1 px-2 h-fit !pointer-events-auto ${
                vote && !vote.isUpvoted
                  ? 'bg-foreground text-background hover:bg-foreground/90' 
                  : 'text-muted-foreground'
              }`}
              variant="outline"
              onClick={handleDownvote}
            >
              <ThumbDownIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Downvote Response</TooltipContent>
        </Tooltip>

        <MessageCost
          message={message as any}
          shouldFetch={shouldFetchCost}
        />

        {extractData && (
          <Popover
            key={extractPopoverKey}
            open={extractPopoverOpen}
            onOpenChange={setExtractPopoverOpen}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    className="py-1 px-2 h-fit text-muted-foreground"
                    variant="outline"
                  >
                    <Database className="h-4 w-4" />
                    <span className="ml-1 text-xs">
                      {extractData.summary
                        ? `${extractData.summary.successful}/${extractData.summary.total}`
                        : 'Data'}
                    </span>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>View extracted data</TooltipContent>
            </Tooltip>

            <PopoverContent
              className="w-[600px] max-h-[400px] overflow-y-auto p-0"
              align="start"
              side="top"
            >
              <div className="p-4">
                <ExtractResults
                  results={extractData.data}
                  title="Extracted Data"
                  isLoading={false}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps: MessageActionsProps, nextProps: MessageActionsProps): boolean => {
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.chatId !== nextProps.chatId) return false;
    return true;
  }
);