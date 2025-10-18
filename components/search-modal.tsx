'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Search, X, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { Chat } from '@/lib/db/queries';
import { formatDistanceToNow } from 'date-fns';
import { useSidebar } from '@/components/ui/sidebar';
import { LoaderIcon } from './icons';
import useSWRInfinite from 'swr/infinite';
import { motion } from 'framer-motion';

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'a few moments ago';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDistanceToNow(date, { addSuffix: true });
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Platform detection hook
function usePlatform() {
  const [platform, setPlatform] = useState<'mac' | 'windows' | 'other'>('other');

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      setPlatform('mac');
    } else if (userAgent.includes('win')) {
      setPlatform('windows');
    }
  }, []);

  return platform;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const t = useTranslations();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const platform = usePlatform();

  const PAGE_SIZE = 20;

  const getKey = (pageIndex: number, previousPageData: { chats: Chat[]; hasMore: boolean } | null) => {
    if (!isOpen) return null;
    if (previousPageData && !previousPageData.hasMore) return null;
    
    const baseUrl = '/api/search/chats';
    const params = new URLSearchParams();
    
    if (debouncedQuery.trim()) {
      params.set('q', debouncedQuery);
    }
    
    params.set('limit', String(PAGE_SIZE));
    
    if (pageIndex > 0 && previousPageData) {
      const lastChat = previousPageData.chats[previousPageData.chats.length - 1];
      if (lastChat) {
        params.set('ending_before', lastChat.id);
      }
    }
    
    return `${baseUrl}?${params.toString()}`;
  };

  const { data, size, setSize, isValidating, isLoading } = useSWRInfinite<{
    chats: Chat[];
    hasMore: boolean;
  }>(getKey, async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to search');
    return res.json();
  }, {
    revalidateFirstPage: false,
  });

  const searchResults = data ? data.flatMap((page) => page.chats) : [];
  const hasMore = data ? data[data.length - 1]?.hasMore : false;
  const hasReachedEnd = !hasMore;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
    setSize(1);
  }, [debouncedQuery, setSize]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults.length]);

  // Focus input when modal opens and handle animation
  useEffect(() => {
    if (isOpen) {
      // Start with closed state, then animate to open
      setIsAnimating(false);
      // Use a very short timeout to trigger the animation
      const animTimer = setTimeout(() => {
        setIsAnimating(true);
        // Focus after animation starts - mobile needs this
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            // Mobile Safari needs this to show keyboard
            inputRef.current.click();
          }
        }, 50);
      }, 10);
      return () => {
        clearTimeout(animTimer);
      };
    } else {
      setSearchQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      setIsAnimating(false);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleSelectChat(searchResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onClose]);


  const handleSelectChat = useCallback((chat: Chat) => {
    router.push(`/chat/${chat.id}`);
    onClose();
    // Close mobile sidebar when selecting a chat
    setOpenMobile(false);
  }, [router, onClose, setOpenMobile]);

  // Don't render anything on server side or if not mounted
  if (!mounted || !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[999] bg-black/20 dark:bg-black/40 flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        isAnimating ? 'opacity-100 backdrop-blur-md' : 'opacity-0 backdrop-blur-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl transition-all duration-300 ease-out relative ${
          isAnimating ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
            <div className="bg-background backdrop-blur-xl rounded-lg shadow-2xl border border-border/50 overflow-hidden">
              {/* Search Header */}
              <div className="relative">
                {/* Gradient border effect */}
                <div className="absolute inset-0 rounded-t-lg bg-gradient-to-r from-orange-500/5 via-primary/5 to-orange-500/5" />
                
                <div className="relative flex items-center gap-3 p-4 border-b border-border/50">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('chat.searchChats')}
                    className="flex-1 bg-transparent outline-none text-lg placeholder:text-muted-foreground/70"
                  />
                  
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Results */}
              <div 
                ref={scrollRef}
                className="max-h-[400px] overflow-y-auto mobile-scroll"
              >
                <div className="p-2">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <div
                          key={`skeleton-${index}`}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                        >
                          <div className="p-1.5 rounded-lg bg-muted/50 animate-pulse">
                            <div className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-muted/50 rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-muted/50 rounded animate-pulse w-1/2" />
                          </div>
                        </div>
                      ))
                    ) : searchResults.length > 0 ? (
                      searchResults.map((chat, index) => (
                        <button
                          key={chat.id}
                          onClick={() => handleSelectChat(chat)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150",
                            "hover:bg-accent/50",
                            selectedIndex === index && "bg-accent/50"
                          )}
                        >
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <MessageSquare className="h-4 w-4 text-primary" />
                          </div>
                          
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm line-clamp-1">
                              {chat.customTitle || chat.title}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {getRelativeTime(new Date(chat.updatedAt))}
                            </div>
                          </div>
                          
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))
                    ) : null}

                    {!isLoading && !isValidating && searchResults.length > 0 && !hasReachedEnd && (
                      <motion.div
                        onViewportEnter={() => {
                          if (!isValidating && hasMore) {
                            setSize((size) => size + 1);
                          }
                        }}
                        className="p-2 text-zinc-500 dark:text-zinc-400 flex flex-row gap-2 items-center justify-center"
                      >
                        <div className="animate-spin">
                          <LoaderIcon />
                        </div>
                      </motion.div>
                    )}

                    {isValidating && searchResults.length > 0 && (
                      <div className="p-2 text-zinc-500 dark:text-zinc-400 flex flex-row gap-2 items-center justify-center">
                        <div className="animate-spin">
                          <LoaderIcon />
                        </div>
                      </div>
                    )}

                    {!isLoading && searchResults.length === 0 && (
                      <div className="p-6 text-center">
                        <div className="inline-flex p-3 rounded-full bg-muted/30 mb-3">
                          <Search className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t('chat.noSearchResults')}
                        </p>
                      </div>
                    )}
                </div>
              </div>

              {/* Footer with shortcuts */}
              <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono">↑</kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono">↓</kbd>
                    <span className="ml-1">Navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono">Enter</kbd>
                    <span className="ml-1">Open</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono">Esc</kbd>
                    <span className="ml-1">Close</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground/60">
                  <span>Quick search:</span>
                  {platform === 'mac' ? (
                    <div className="flex items-center gap-0.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">⌘</kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">K</kbd>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Ctrl</kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">K</kbd>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}