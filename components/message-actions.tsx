import type { Message, UIMessage } from 'ai';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';
import { useState } from 'react';

import type { Vote } from '@/lib/db/schema';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon, ChevronDownIcon } from './icons';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import { MessageCost } from './message-cost';
import { GitBranch, MoreHorizontal } from 'lucide-react';

// Helper function to extract text content from message parts
function extractTextFromMessage(message: Message): string {
  if (!message.parts || !Array.isArray(message.parts)) {
    // Fallback to content if it exists (for backward compatibility)
    if (typeof message.content === 'string') {
      return message.content;
    }
    return '';
  }

  // Extract all text parts and join them
  const textParts = message.parts
    .filter((part: any) => part.type === 'text' && part.text)
    .map((part: any) => part.text)
    .join('\n\n');

  return textParts;
}

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  shouldCostFetch,
  onBranch,
}: {
  chatId: string;
  message: UIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  shouldCostFetch?: boolean;
  onBranch?: () => void;
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();
  const [open, setOpen] = useState(false);

  if (isLoading) return null;
  if (message.role === 'user') return null;

  const handleCopy = async () => {
    const textContent = extractTextFromMessage(message);
    if (textContent) {
      await copyToClipboard(textContent);
      toast.success('Copied to clipboard!');
    } else {
      toast.error('No text content to copy');
    }
    setOpen(false);
  };

  const handleUpvote = async () => {
    const upvote = fetch('/api/vote', {
      method: 'PATCH',
      body: JSON.stringify({
        chatId,
        messageId: message.id,
        type: 'up',
      }),
    });

    toast.promise(upvote, {
      loading: 'Upvoting Response...',
      success: () => {
        mutate<Array<Vote>>(
          `/api/vote?chatId=${chatId}`,
          (currentVotes) => {
            if (!currentVotes) return [];

            const votesWithoutCurrent = currentVotes.filter(
              (vote) => vote.messageId !== message.id,
            );

            return [
              ...votesWithoutCurrent,
              {
                chatId,
                messageId: message.id,
                isUpvoted: true,
              },
            ];
          },
          { revalidate: false },
        );

        return 'Upvoted Response!';
      },
      error: 'Failed to upvote response.',
    });
    setOpen(false);
  };

  const handleDownvote = async () => {
    const downvote = fetch('/api/vote', {
      method: 'PATCH',
      body: JSON.stringify({
        chatId,
        messageId: message.id,
        type: 'down',
      }),
    });

    toast.promise(downvote, {
      loading: 'Downvoting Response...',
      success: () => {
        mutate<Array<Vote>>(
          `/api/vote?chatId=${chatId}`,
          (currentVotes) => {
            if (!currentVotes) return [];

            const votesWithoutCurrent = currentVotes.filter(
              (vote) => vote.messageId !== message.id,
            );

            return [
              ...votesWithoutCurrent,
              {
                chatId,
                messageId: message.id,
                isUpvoted: false,
              },
            ];
          },
          { revalidate: false },
        );

        return 'Downvoted Response!';
      },
      error: 'Failed to downvote response.',
    });
    setOpen(false);
  };

  const handleBranch = () => {
    onBranch?.();
    setOpen(false);
  };
  
  return (
    <div className="flex flex-row items-center">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-transparent mr-1"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
            <CopyIcon className="h-3 w-3" />
            Copy message
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleUpvote} 
            disabled={vote?.isUpvoted}
            className="gap-2 cursor-pointer"
          >
            <ThumbUpIcon className="h-3 w-3" />
            Upvote
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleDownvote} 
            disabled={vote && !vote.isUpvoted}
            className="gap-2 cursor-pointer"
          >
            <ThumbDownIcon className="h-3 w-3" />
            Downvote
          </DropdownMenuItem>
          
          {onBranch && (
            <DropdownMenuItem onClick={handleBranch} className="gap-2 cursor-pointer">
              <GitBranch className="h-3 w-3" />
              Branch from here
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <MessageCost message={message} shouldFetch={shouldCostFetch} />
    </div>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);
