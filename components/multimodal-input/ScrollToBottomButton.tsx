'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';

export function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useScrollToBottom();
  return (
    <AnimatePresence>
      {!isAtBottom && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute left-1/2 bottom-28 -translate-x-1/2 z-10"
        >
          <Button
            data-testid="scroll-to-bottom-button"
            className="rounded-full"
            size="icon"
            variant="outline"
            onClick={(event) => {
              event.preventDefault();
              scrollToBottom();
            }}
          >
            <ArrowDown />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}