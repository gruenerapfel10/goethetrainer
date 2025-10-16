'use client';

import {
  memo,
  useEffect,
  useRef,
  useState,
} from 'react';
import classNames from 'classnames';
import { SuggestedActions } from '@/components/SuggestedActions';
import { FileMentions } from './FileMentions';
import { ModelSelector } from '@/components/model-selector';
import { useChat } from '@/contexts/chat-context';
import { motion } from 'framer-motion';
import { useMobileKeyboard } from '@/hooks/use-mobile-keyboard';

import { AttachmentsButton } from './AttachmentsButton';
import { SendButton } from './SendButton';
import { Input } from './Input';
import { CapabilitiesToggle } from './CapabilitiesToggle';
import { FileSearch } from '@/components/FileSearch';
import { ScrollToBottomButton } from './ScrollToBottomButton';
import { AttachmentsDropOverlay } from './AttachmentsDropOverlay';
import { StreamContinuationNotice } from '@/components/StreamContinuationNotice';

function PureMultimodalInput({
  className,
}: {
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLFormElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { isAndroid } = useMobileKeyboard();
  const { messages } = useChat();
  const [debugMessages] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        document.documentElement.style.setProperty('--input-height', `${height + 16}px`);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      document.documentElement.style.removeProperty('--input-height');
    };
  }, []);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);


  const hasMessages = debugMessages || messages.length > 0;
  const shouldCenter = !hasMessages && !isMobile;

  return (
    <motion.div
      className="absolute left-0 right-0 pointer-events-none flex justify-center z-1 chat-input-container"
      initial={false}
      animate={{
        top: shouldCenter ? '50%' : 'auto',
        bottom: shouldCenter ? 'auto' : 0,
        y: shouldCenter ? '-50%' : 0
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8
      }}
    >
      <div
        className={`pointer-events-auto w-full max-w-3xl px-4 pt-4 ${isAndroid
          ? 'pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:pb-[calc(env(safe-area-inset-bottom)+1rem)]'
          : 'pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:pb-[calc(env(safe-area-inset-bottom)+1rem)]'
          }`}
      >
        <form
          ref={inputContainerRef}
          className="flex gap-2 w-full items-center justify-center"
        >
          <div
            ref={containerRef}
            className="relative w-full flex flex-col gap-2 max-w-3xl z-50 ml-11 [[data-narrow=true]_&]:ml-0"
          >
            {/* Components above the input area */}

            {/* <StreamContinuationNotice /> */}

            <ScrollToBottomButton />

            {/* Suggested Actions UI - shows when no messages sent */}
            <SuggestedActions />

            {/* File Mentions UI - shows the @ mentions like in cursor @attachment-name */}
            <FileMentions />

            {/* File Search UI - for sharepoint agent where you can search kb */}
            <FileSearch
              isCompact={true}
            />

            <div
              className={classNames(
                'group relative rounded-[14px] bg-background/90 backdrop-blur-sm transition-all duration-300 px-3 pt-3 pb-2',
                'border border-border/50',
                'shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/5 hover:border-border/70',
                'focus-within:shadow-xl focus-within:shadow-orange-500/5 focus-within:ring-1 focus-within:ring-orange-500/10 focus-within:border-orange-500/20 focus-within:bg-background/95',
                className,
              )}
            >
              <div
                className={classNames(
                  'absolute inset-0 rounded-[32px] transition-opacity duration-500 pointer-events-none',
                  'bg-gradient-to-r from-orange-500/5 via-primary/5 to-orange-500/5 blur-md',
                  'opacity-20 group-focus-within:opacity-70',
                )}
              />

              <Input />

              <div className="flex items-center gap-1 pt-4 w-full min-w-0">
                <AttachmentsButton />

                <div className="flex-1 min-w-0">
                  <CapabilitiesToggle />
                </div>

                <ModelSelector />

                <SendButton />
              </div>

              <AttachmentsDropOverlay />
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput);