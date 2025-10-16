'use client';
import type { UIMessage } from 'ai';

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { UseChatHelpers } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { ArrowUpIcon, StopIcon } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import classNames from 'classnames';
import { useChat, AttachmentStatus } from '@/contexts/chat-context';
import { useWindowSize } from 'usehooks-ts';

function PureSendButton() {
  const { input, status, abort, sendMessage, attachments } = useChat();
  const hasProcessingFiles = attachments.some(attachment => attachment.status === AttachmentStatus.UPLOADING);
  const isStreaming = status === 'submitted' || status === 'streaming';
  const isDisabled =
    input.length === 0 ||
    status === 'error' ||
    (!isStreaming && status !== 'ready') ||
    hasProcessingFiles;
  const isActive = !isDisabled && input.length > 0;
  const isProcessing = hasProcessingFiles && input.length > 0;

  const handleStop = useCallback(async () => {
    console.log('[SendButton] ========== STOP BUTTON CLICKED ==========');
    console.log('[SendButton] Server onAbort will handle partial message saving');
    
    abort();
    console.log('[SendButton] ========== STOP SEQUENCE COMPLETE ==========');
  }, [abort]);

  if (isStreaming) {
    return (
      <Button
        data-testid="stop-button"
        className={classNames(
          'rounded-[14px] p-3 h-fit transition-all duration-300 group relative overflow-hidden',
          'bg-foreground text-background border border-transparent',
          'shadow-md hover:shadow-lg hover:shadow-foreground/10',
        )}
        onClick={(event) => {
          console.log('[SendButton] ========== BUTTON CLICK DETECTED ==========');
          event.preventDefault();
          handleStop();
        }}
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <StopIcon size={16} className="text-background" />
        </motion.div>
        <motion.div
          className="absolute inset-0 rounded-[14px] bg-foreground/20"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
        />
      </Button>
    );
  }

  return (
    <Button
      data-testid="send-button"
      className={classNames(
        'rounded-[14px] p-3 h-fit transition-all duration-300 group relative overflow-hidden',
        isDisabled && !isProcessing
          ? 'bg-muted/30 border border-border/20 cursor-not-allowed'
          : isProcessing
          ? 'bg-amber-500/70 border border-amber-300/50 cursor-not-allowed shadow-md hover:shadow-lg hover:shadow-amber-500/20'
          : 'bg-primary hover:bg-primary/90 border border-primary/20 hover:border-primary/30 shadow-md hover:shadow-lg hover:shadow-primary/10',
      )}
      onClick={(event) => {
        event.preventDefault();
        sendMessage();
      }}
      disabled={isDisabled}
      title={
        hasProcessingFiles
          ? 'Please wait for files to finish processing before sending'
          : undefined
      }
    >
      {isProcessing ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
        >
          <Loader2 size={16} className="text-amber-900" />
        </motion.div>
      ) : (
        <motion.div
          animate={isActive ? { rotate: 45 } : { rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <ArrowUpIcon
            size={16}
            className={classNames(
              'transition-colors duration-300 bg-transparent',
              isDisabled ? 'text-muted-foreground' : 'text-primary-foreground',
            )}
          />
        </motion.div>
      )}

      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-[14px] bg-primary/20"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
        />
      )}
    </Button>
  );
}

export const SendButton = memo(PureSendButton);