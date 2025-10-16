'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useChat } from '@/contexts/chat-context';

export function StreamContinuationNotice() {
  const { messages, status } = useChat();
  const [isVisible, setIsVisible] = useState(false);
  const [hasShownOnce, setHasShownOnce] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Only show once per chat - on first message submission
    if ((status === 'submitted' || status === 'streaming') && messages.length === 1 && !hasShownOnce) {
      setIsVisible(true);
      setHasShownOnce(true);
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
    } else if (status === 'ready' && messages.length > 1) {
      // Hide when first AI reply is done
      setIsVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [status, messages.length, hasShownOnce]);
  
  const handleDismiss = () => {
    setIsVisible(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: 10, height: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 300, 
            damping: 25,
            duration: 0.5 
          }}
          className="w-full mb-3"
        >
          <div className="relative bg-gradient-to-br from-background via-background to-background/95 border border-border/50 rounded-2xl shadow-2xl shadow-orange-500/10 backdrop-blur-xl overflow-hidden">
            {/* Decorative gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-primary/5 to-orange-500/5" />
            
            {/* Animated glow effect */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent animate-shimmer" />
            </div>
            
            <div className="relative p-4">
              {/* Compact header with inline content */}
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="relative flex items-center justify-center w-8 h-8">
                    <Image 
                      src="/moterra-logo-s.svg" 
                      alt="Moterra" 
                      width={24} 
                      height={24}
                      className="w-6 h-6"
                    />
                  </div>
                </div>
                
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Moterra is working in the background
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Feel free to leave - we&apos;ll reconnect you when you return
                    </p>
                  </div>
                  
                  {/* Compact actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="p-1.5 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}