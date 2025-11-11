'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { GlowingEffect } from '@/components/ui/glowing-effect';

interface LoadingProps {
  prompt?: string;
  input?: any;
}

export function Loading({ prompt, input }: LoadingProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  
  // Debug logging
  useEffect(() => {
    console.log('[Loading] Received input:', input);
    console.log('[Loading] Received prompt:', prompt);
  }, [input, prompt]);

  useEffect(() => {
    setLoadingProgress(0);
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          // Set finished when progress reaches 100 (full prompt shown)
          setTimeout(() => setIsFinished(true), 500);
          return 100;
        }
        const increment = Math.max(1, Math.floor((100 - prev) / 10));
        return prev + increment;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let animationId: number | null = null;
    let isHovered = false;
    const scrollSpeed = 0.5; // pixels per frame
    let lastTime = 0;

    const smoothScroll = (currentTime: number) => {
      if (isHovered) {
        animationId = requestAnimationFrame(smoothScroll);
        return;
      }

      // Throttle to roughly 60fps
      if (currentTime - lastTime >= 16.67) {
        if (container.scrollHeight > container.clientHeight) {
          // Check if at bottom
          if (container.scrollTop + container.clientHeight >= container.scrollHeight - 5) {
            // Reset to top smoothly
            container.scrollTo({ top: 0, behavior: 'smooth' });
            // Pause briefly after reset
            setTimeout(() => {
              if (animationId) {
                animationId = requestAnimationFrame(smoothScroll);
              }
            }, 2000);
            return;
          } else {
            // Smooth scroll down
            container.scrollTop += scrollSpeed;
          }
        }
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(smoothScroll);
    };

    const handleMouseEnter = () => {
      isHovered = true;
    };

    const handleMouseLeave = () => {
      isHovered = false;
    };

    // Start after delay
    const startDelay = setTimeout(() => {
      animationId = requestAnimationFrame(smoothScroll);
    }, 1000);

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearTimeout(startDelay);
      if (animationId) cancelAnimationFrame(animationId);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const getLoadingText = () => {
    if (loadingProgress < 30) return 'Analyzing prompt...';
    if (loadingProgress < 70) return 'Generating image...';
    return 'Finalizing details...';
  };

  // Parse the structured input for display
  // The input should contain the actual prompt sent to the tool
  let displayData: string;
  
  if (input) {
    // If input is already an object with content, use it
    if (typeof input === 'object' && Object.keys(input).length > 0) {
      displayData = JSON.stringify(input, null, 2);
    } 
    // If input is a string, parse it
    else if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        displayData = JSON.stringify(parsed, null, 2);
      } catch {
        displayData = JSON.stringify({ prompt: input }, null, 2);
      }
    }
    // Empty object or other
    else {
      displayData = JSON.stringify({ prompt: prompt || "Processing..." }, null, 2);
    }
  } else if (prompt) {
    displayData = JSON.stringify({ prompt }, null, 2);
  } else {
    // This should not happen in production - the input should always be provided
    console.warn('[Loading] No input or prompt provided');
    displayData = JSON.stringify({ 
      error: "No input data available",
      status: "Waiting for prompt..."
    }, null, 2);
  }
  
  const lines = displayData.split('\n');

  // Function to format the line with proper syntax highlighting
  const formatLine = (line: string) => {
    const trimmed = line.trim();
    
    // Handle property keys with string values
    if (trimmed.includes('": "')) {
      const parts = trimmed.split('": "');
      const key = `${parts[0]}"`;
      const value = `"${parts.slice(1).join('": "')}`;
      return (
        <>
          <span className="text-blue-600 dark:text-blue-400">{key}</span>
          <span className="text-foreground/50">: </span>
          <span className="text-green-600 dark:text-green-500">{value}</span>
        </>
      );
    }
    
    // Handle property keys with non-string values
    if (trimmed.includes('": ')) {
      const colonIndex = trimmed.indexOf('": ');
      const key = trimmed.substring(0, colonIndex + 1);
      const value = trimmed.substring(colonIndex + 3);
      
      let valueClass = 'text-foreground/60';
      if (value === 'true' || value === 'false' || value.startsWith('true,') || value.startsWith('false,')) {
        valueClass = 'text-purple-600 dark:text-purple-500';
      } else if (value === 'null' || value.startsWith('null,')) {
        valueClass = 'text-purple-600 dark:text-purple-500';
      } else if (value.match(/^-?\d+\.?\d*,?$/)) {
        valueClass = 'text-amber-600 dark:text-amber-500';
      } else if (value === '{' || value === '[') {
        valueClass = 'text-foreground/50';
      }
      
      return (
        <>
          <span className="text-blue-600 dark:text-blue-400">{key}</span>
          <span className="text-foreground/50">: </span>
          <span className={valueClass}>{value}</span>
        </>
      );
    }
    
    // Handle plain braces/brackets
    if (trimmed === '{' || trimmed === '}' || trimmed === '[' || trimmed === ']' || 
        trimmed === '},' || trimmed === '],' || trimmed.startsWith('},') || trimmed.startsWith('],')) {
      return <span className="text-foreground/50">{trimmed}</span>;
    }
    
    // Default - for string values without quotes visible in structure
    const isStringValue = trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.endsWith('",');
    if (isStringValue) {
      return <span className="text-green-600 dark:text-green-500">{trimmed}</span>;
    }
    
    return <span className="text-foreground/60">{trimmed}</span>;
  };

  return (
    <motion.div 
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative h-full rounded-[12px] border p-0.5">
        <GlowingEffect
          spread={50}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.1}
          autoRotate={true}
          borderWidth={3}
          dualEffect={true}
        />
        <div 
          ref={cardContainerRef}
          className="relative h-full rounded-[11px] bg-muted/50 backdrop-blur-sm overflow-hidden"
        >
          {/* Vignette effect overlay */}
          <div 
            className="absolute inset-0 pointer-events-none rounded-[11px] bg-gradient-to-r from-transparent via-transparent to-background/80"
            style={{
              background: `radial-gradient(ellipse at center, transparent 50%, hsl(var(--background) / 0.8) 100%)`,
            }}
          />

        {/* Scrollable JSON Content */}
        <div 
          ref={scrollContainerRef}
          className="relative h-full overflow-y-auto scrollbar-none p-2 sm:p-4"
          style={{ 
            scrollBehavior: 'smooth',
            transform: 'translateZ(0)' // Hardware acceleration
          }}
        >
            <div className="space-y-0.5 font-mono text-xs sm:text-sm">
              {lines.map((line, index) => {
                const indent = line.length - line.trim().length;
                
                return (
                  <motion.div
                    key={index}
                    className="min-h-[18px] sm:min-h-[22px]"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    style={{ paddingLeft: `${Math.min(indent * 8, 32)}px` }}
                  >
                    {loadingProgress < 100 && index > loadingProgress / 5 && !isFinished ? (
                      // Skeleton loading bar - only show if not finished
                      <motion.div
                        className="h-4 rounded"
                        style={{ 
                          width: `${Math.random() * 50 + 20}%`,
                          background: index % 3 === 0 ? 
                            'linear-gradient(90deg, rgb(251 146 60 / 0.3), rgb(251 146 60 / 0.1))' : 
                            index % 3 === 1 ?
                            'linear-gradient(90deg, rgb(34 197 94 / 0.3), rgb(34 197 94 / 0.1))' :
                            'linear-gradient(90deg, rgb(var(--muted-foreground) / 0.3), rgb(var(--muted-foreground) / 0.1))'
                        }}
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                      />
                    ) : loadingProgress >= 100 || isFinished || index <= loadingProgress / 5 ? (
                      // Actual content with syntax highlighting
                      <motion.code
                        className="inline-block"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.05 }}
                      >
                        {formatLine(line)}
                      </motion.code>
                    ) : null}
                  </motion.div>
                );
              })}
            </div>
        </div>
        </div>
      </div>
    </motion.div>
  );
}