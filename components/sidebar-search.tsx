'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from './ui/sidebar';

interface SidebarSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
  onOpenModal: () => void;
}


export function SidebarSearch({ value, onChange, resultCount, onOpenModal }: SidebarSearchProps) {
  const { state } = useSidebar();
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Show collapsed search button when sidebar is collapsed
  if (state === 'collapsed') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="px-0"
      >
        <button
          onClick={onOpenModal}
          className={cn(
            "relative group transition-all duration-200 w-full",
            "h-9 rounded-xl flex items-center justify-center",
            "bg-sidebar-accent/50 backdrop-blur-sm",
            "border border-sidebar-border/50",
            "hover:bg-sidebar-accent/70 hover:border-sidebar-ring/50",
            "hover:scale-105"
          )}
        >
          {/* Background glow effect */}
          <div
            className={cn(
              "absolute inset-0 rounded-xl opacity-0 blur-xl transition-opacity duration-300",
              "bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20",
              "group-hover:opacity-100"
            )}
          />
          
          <Search className="h-4 w-4 text-muted-foreground group-hover:text-sidebar-foreground transition-colors duration-200 relative z-10" />
        </button>
      </motion.div>
    );
  }

  const showClearButton = value.length > 0;
  const isActive = isFocused || value.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="px-0"
    >
      <div
        className={cn(
          "relative group transition-all duration-200",
          isActive && "scale-[1.02]"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background glow effect */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl opacity-0 blur-xl transition-opacity duration-300",
            "bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20",
            (isFocused || isHovered) && "opacity-100"
          )}
        />

        {/* Search container */}
        <div
          className={cn(
            "relative flex items-center gap-2 px-3 h-9 rounded-xl",
            "bg-sidebar-accent/50 backdrop-blur-sm",
            "border border-sidebar-border/50",
            "transition-all duration-200",
            isFocused && "bg-sidebar-accent/80 border-sidebar-ring/50 shadow-lg",
            "hover:bg-sidebar-accent/70"
          )}
        >
          {/* Search icon with animation */}
          <motion.div
            animate={{
              scale: isActive ? 1.1 : 1,
              rotate: isActive ? 360 : 0,
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Search 
              className={cn(
                "h-4 w-4 transition-colors duration-200",
                isActive ? "text-sidebar-foreground" : "text-muted-foreground"
              )} 
            />
          </motion.div>

          {/* Input field - clickable to open modal */}
          <button
            onClick={onOpenModal}
            className={cn(
              "flex-1 bg-transparent outline-none text-sm text-left",
              "placeholder:text-muted-foreground/70",
              "text-sidebar-foreground",
              "transition-all duration-200"
            )}
          >
            <span className="text-muted-foreground/70">{t('chat.searchChats')}</span>
          </button>

          {/* Right side content */}
          <div className="flex items-center gap-1">
            {/* Result count */}
            <AnimatePresence mode="wait">
              {resultCount !== undefined && value && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-md bg-sidebar-accent/50"
                >
                  {resultCount}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Clear button */}
            <AnimatePresence mode="wait">
              {showClearButton && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => {
                    onChange('');
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    "p-0.5 rounded-md transition-all duration-200",
                    "hover:bg-sidebar-accent active:scale-90"
                  )}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Focus ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl ring-2 ring-sidebar-ring/50 ring-offset-2 ring-offset-background",
            "opacity-0 transition-opacity duration-200 pointer-events-none",
            isFocused && "opacity-100"
          )}
        />
      </div>
    </motion.div>
  );
}