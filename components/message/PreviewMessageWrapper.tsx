'use client';

import { memo, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon } from '../icons';
import { MessageActions } from '../message-actions';
import { cn } from '@/lib/utils';
import { AttachmentRenderer } from './AttachmentRenderer';
import { MessageContentOrchestrator } from './MessageContentOrchestrator';
import type { PreviewMessageProps, Attachment } from './types';

const messageVariants = {
  initial: { y: 8, opacity: 0, scale: 0.98 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.8,
    },
  },
  exit: {
    y: -4,
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.15 },
  },
};

const avatarVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { delay: 0.1, duration: 0.2 },
  },
};

export const PreviewMessageWrapper = memo<PreviewMessageProps>(
  ({
    chatId,
    message,
    vote,
    isLoading,
    setMessages,
    regenerate,
    isReadonly,
    requiresScrollPadding,
    completedMessageIds = new Set(),
    messages = [],
    selectedFiles = [],
    isInContext,
    allAttachments = [],
    allAttachmentsMap,
  }) => {
    const [mode, setMode] = useState<'view' | 'edit'>('view');

    const messageActionsKey = useMemo(
      () => `actions-${chatId}-${message.id}`,
      [chatId, message.id],
    );

    const attachments = useMemo(() => {
      return allAttachments.filter(att => 
        att.messageId === message.id && att.status === 'sent'
      ) as Attachment[];
    }, [allAttachments, message.id]);

    const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
    const contextIndicatorClass = debugMode ? (
      isInContext === undefined ? '' :
        isInContext ? 'ring-2 ring-green-500/50 bg-green-50/5' :
          'ring-2 ring-red-500/50 bg-red-50/5'
    ) : '';

    return (
      <motion.div
        className={cn(
          "w-full mx-auto max-w-3xl px-4 group/message",
          debugMode && contextIndicatorClass
        )}
        variants={messageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        data-role={message.role}
        data-testid={`message-${message.role}`}
      >
        <div
          className={cn('w-full flex gap-3', {
            'ml-auto max-w-2xl': message.role === 'user' && mode !== 'edit',
            'w-fit': message.role === 'user' && mode !== 'edit',
            'w-full': mode === 'edit',
          })}
        >
          {message.role === 'assistant' && (
            <motion.div
              className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border/50 bg-gradient-to-br from-background to-muted/50 shadow-sm [[data-narrow=true]_&]:hidden"
              variants={avatarVariants}
              initial="initial"
              animate="animate"
            >
              <SparklesIcon size={14} />
            </motion.div>
          )}

          <div
            className={cn('flex flex-col w-full relative', {
              'min-h-96': message.role === 'assistant' && requiresScrollPadding,
            })}
          >
            {debugMode && isInContext !== undefined && (
              <div className={cn(
                "absolute -right-2 -top-2 px-2 py-0.5 text-xs font-medium rounded-full",
                isInContext
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              )}>
                {isInContext ? "IN" : "OUT"}
              </div>
            )}
            {message.role === 'user' && attachments.length > 0 && (
              <AttachmentRenderer
                attachments={attachments}
                messageId={message.id}
              />
            )}

            <MessageContentOrchestrator
              message={message}
              mode={mode}
              isReadonly={isReadonly}
              setMode={setMode}
              setMessages={setMessages}
              regenerate={regenerate}
              messages={messages}
              selectedFiles={selectedFiles}
              isLoading={isLoading}
              allAttachmentsMap={allAttachmentsMap}
            />

            {!isReadonly && message.role === 'assistant' && (
              <>
                {isLoading ? (
                  <div className="h-[38px] mt-2" />
                ) : (
                  <MessageActions
                    key={messageActionsKey}
                    chatId={chatId}
                    message={message as any}
                    vote={vote}
                    isLoading={isLoading}
                    shouldFetchCost={completedMessageIds.has(message.id)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    );
  },
);

PreviewMessageWrapper.displayName = 'PreviewMessageWrapper';