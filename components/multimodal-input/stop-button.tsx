'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { UseChatHelpers } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { StopIcon } from '@/components/icons';
import classNames from 'classnames';

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className={classNames(
        'rounded-[14px] p-3 h-fit transition-all duration-300 group relative overflow-hidden',
        'bg-foreground text-background border border-transparent',
        'shadow-md hover:shadow-lg hover:shadow-foreground/10',
      )}
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
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

export const StopButton = memo(PureStopButton);