'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Search, X, Command, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { Chat } from '@/lib/db/schema';
import { format } from 'date-fns';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
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

export function SearchModal({ isOpen, onClose, chats }: SearchModalProps) {
  const t = useTranslations();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const platform = usePlatform();

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter chats based on search
  const filteredChats = searchQuery.trim()
    ? chats.filter(chat => {
        const title = (chat.customTitle || chat.title || '').toLowerCase();
        return title.includes(searchQuery.toLowerCase());
      })
    : chats.slice(0, 5); // Show recent 5 when no search

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input when modal opens and handle animation
  useEffect(() => {
    if (isOpen) {
      // Start with closed state, then animate to open
      setIsAnimating(false);
      // Use a very short timeout to trigger the animation
      const timer = setTimeout(() => {
        setIsAnimating(true);
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery('');
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
            prev < filteredChats.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredChats[selectedIndex]) {
            handleSelectChat(filteredChats[selectedIndex]);
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
  }, [isOpen, filteredChats, selectedIndex, onClose]);

  const handleSelectChat = useCallback((chat: Chat) => {
    router.push(`/chat/${chat.id}`);
    onClose();
  }, [router, onClose]);

  // Don't render anything on server side or if not mounted
  if (!mounted) return null;

  return (
    <>
      {isOpen && (
        <div
          style={{ zIndex: 2147483647 }}
          className={`fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center p-4 transition-all duration-300 ease-out ${
            isAnimating ? 'opacity-100 backdrop-blur-md' : 'opacity-0 backdrop-blur-none'
          }`}
          onClick={onClose}
        >
          <div
            className={`w-full max-w-2xl transition-all duration-300 ease-out ${
              isAnimating ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-background backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
              {/* Search Header */}
              <div className="relative">
                {/* Gradient border effect */}
                <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-r from-orange-500/5 via-primary/5 to-orange-500/5" />
                
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
                  
                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto">
                {filteredChats.length > 0 ? (
                  <div className="p-2">
                    {searchQuery.trim() === '' && (
                      <div className="px-3 py-2 text-xs text-muted-foreground font-medium">
                        {t('chat.recentChats')}
                      </div>
                    )}
                    
                    {filteredChats.map((chat, index) => (
                      <button
                        key={chat.id}
                        onClick={() => handleSelectChat(chat)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150",
                          "hover:bg-accent/50",
                          selectedIndex === index && "bg-accent/50"
                        )}
                      >
                        <div className="p-2 rounded-lg bg-primary/10">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm line-clamp-1">
                            {chat.customTitle || chat.title}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {format(new Date(chat.updatedAt), 'MMM d, h:mm a')}
                          </div>
                        </div>
                        
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="inline-flex p-3 rounded-full bg-muted/30 mb-3">
                      <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('chat.noSearchResults')}
                    </p>
                  </div>
                )}
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
      )}
    </>
  );
}