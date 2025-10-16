'use client';

import { memo, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { SparklesIcon } from './icons';
import { PreviewMessageWrapper } from './message/PreviewMessageWrapper';
import type { UnifiedProcessingMessageProps } from './message/types';

export { toExtendedMessage } from './message/types';
export type { ExtendedUIMessage, PreviewMessageProps } from './message/types';

export const PreviewMessage = memo(PreviewMessageWrapper);

const UnifiedProcessingMessage = memo<UnifiedProcessingMessageProps>(
  ({ isProcessing = false, delay = 0 }) => {
    const t = useTranslations('chat');
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [currentPhase, setCurrentPhase] = useState<'thinking' | 'processing'>(
      isProcessing ? 'processing' : 'thinking',
    );

    const messages = useMemo(() => {
      const thinkingMessages = Array.from({ length: 12 }, (_, i) =>
        t(`thinkingMessage${i + 1}` as any),
      );
      const processingMessages = Array.from({ length: 10 }, (_, i) =>
        t(`processingMessage${i + 1}` as any),
      );
      return [...thinkingMessages, ...processingMessages];
    }, [t]);

    useEffect(() => {
      if (isProcessing && currentPhase === 'thinking') {
        setCurrentPhase('processing');
      } else if (!isProcessing && currentPhase === 'processing') {
        setCurrentPhase('thinking');
      }
    }, [isProcessing, currentPhase]);

    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
      }, 2500);

      return () => clearInterval(interval);
    }, [messages.length]);

    return (
      <motion.div
        className="w-full mx-auto max-w-3xl px-4 group/message relative"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay, type: 'spring', stiffness: 400, damping: 25 }}
        data-role="assistant"
        data-testid="message-assistant-loading"
      >
        <div className="w-full flex gap-3">
          <motion.div
            className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border/50 bg-gradient-to-br from-background to-muted/50 shadow-sm [[data-narrow=true]_&]:hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay + 0.1, duration: 0.2 }}
          >
            <SparklesIcon size={14} />
          </motion.div>
          <div className="flex items-center w-full min-h-8">
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentMessageIndex}
                  className="text-[15px] font-medium text-muted-foreground/80"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeInOut',
                  }}
                >
                  {messages[currentMessageIndex].replace(/\.{3}$/, '')}
                </motion.span>
              </AnimatePresence>
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 bg-muted-foreground/60 rounded-full"
                    animate={{
                      opacity: [0.4, 1, 0.4],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);

UnifiedProcessingMessage.displayName = 'UnifiedProcessingMessage';

export const ThinkingMessage = () => (
  <UnifiedProcessingMessage isProcessing={false} />
);

export const ProcessingMessage = () => (
  <UnifiedProcessingMessage isProcessing={true} delay={0.2} />
);