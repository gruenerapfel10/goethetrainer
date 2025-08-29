'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import type { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { memo, useEffect, useState } from 'react';
import { defaultSuggestions } from './defaultConfig';
import { Skeleton } from '../ui/skeleton';
import { 
  FileTextIcon, 
  CalendarIcon, 
  BrainCircuitIcon, 
  MessageSquareIcon,
  LightbulbIcon,
  TrendingUpIcon,
  SearchIcon,
  UsersIcon,
  ArrowRightIcon,
  GraduationCapIcon,
  MapPinIcon,
  ClipboardCheckIcon,
  BarChart3Icon
} from 'lucide-react';

// Action suggestion data type
export interface SuggestedAction {
  title: string;
  label: string;
  action: string;
}

// Icon mapping for different suggestion types
const getIconForSuggestion = (title: string, index: number) => {
  const iconProps = { size: 20, className: "text-primary/80 dark:text-blue-400/80" };
  
  // Map based on keywords in the title - University application focused
  if (title.toLowerCase().includes('choose') || title.toLowerCase().includes('universities')) return <GraduationCapIcon key="universities" {...iconProps} />;
  if (title.toLowerCase().includes('timeline') || title.toLowerCase().includes('deadline')) return <CalendarIcon key="timeline" {...iconProps} />;
  if (title.toLowerCase().includes('personal statement') || title.toLowerCase().includes('review') || title.toLowerCase().includes('essay')) return <FileTextIcon key="essay" {...iconProps} />;
  if (title.toLowerCase().includes('compare') || title.toLowerCase().includes('programs')) return <BarChart3Icon key="compare" {...iconProps} />;
  if (title.toLowerCase().includes('application') || title.toLowerCase().includes('checklist')) return <ClipboardCheckIcon key="application" {...iconProps} />;
  
  // General mapping for other agents
  if (title.toLowerCase().includes('proposal')) return <FileTextIcon key="proposal" {...iconProps} />;
  if (title.toLowerCase().includes('campaign') || title.toLowerCase().includes('brainstorm')) return <LightbulbIcon key="campaign" {...iconProps} />;
  if (title.toLowerCase().includes('response') || title.toLowerCase().includes('draft')) return <MessageSquareIcon key="response" {...iconProps} />;
  if (title.toLowerCase().includes('trend') || title.toLowerCase().includes('analysis')) return <TrendingUpIcon key="trend" {...iconProps} />;
  if (title.toLowerCase().includes('search') || title.toLowerCase().includes('find')) return <SearchIcon key="search" {...iconProps} />;
  if (title.toLowerCase().includes('competitive') || title.toLowerCase().includes('market')) return <UsersIcon key="market" {...iconProps} />;
  
  // Fallback icons based on index
  const fallbackIcons = [
    <GraduationCapIcon key="fallback-grad" {...iconProps} />,
    <CalendarIcon key="fallback-calendar" {...iconProps} />,
    <FileTextIcon key="fallback-file" {...iconProps} />,
    <BarChart3Icon key="fallback-chart" {...iconProps} />
  ];
  
  return fallbackIcons[index % fallbackIcons.length];
};

interface SuggestedActionsProps {
  chatId: string;
  selectedModelId: string;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
}

function PureSuggestedActions({
  chatId,
  selectedModelId,
  append,
}: SuggestedActionsProps) {
  const [messages, setMessages] = useState<SuggestedAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSuggestedMessages() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/suggested-messages?modelId=${selectedModelId}`,
        );

        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        } else {
          // Fallback to default suggestions if API fails
          const fallbackMessages = defaultSuggestions[selectedModelId] || [];
          setMessages(fallbackMessages);
        }
      } catch (error) {
        console.error('Failed to fetch suggested messages:', error);
        // Fallback to default suggestions if API fails
        const fallbackMessages = defaultSuggestions[selectedModelId] || [];
        setMessages(fallbackMessages);
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestedMessages();
  }, [selectedModelId]);


  // Limit the number of messages to show (between 1 and 4)
  const displayMessages = messages.slice(0, 4);

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex flex-col -mt-2"
      >
        {[1, 2, 3, 4].map((num) => (
          <div
            key={`skeleton-${num}`}
            className={`flex items-center gap-3 p-2.5 ${num < 4 ? 'border-b border-border/10' : ''}`}
          >
            <Skeleton className="h-5 w-5 bg-accent" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-[140px] bg-accent" />
              <Skeleton className="h-3 w-[180px] bg-accent" />
            </div>
            <Skeleton className="h-4 w-4 bg-accent opacity-40" />
          </div>
        ))}
      </motion.div>
    );
  }

  if (displayMessages.length === 0) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex flex-col -mt-2"
    >
      <AnimatePresence mode="wait">
        {displayMessages.map((message, index) => (
          <motion.div
            key={`suggested-action-${index}`}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ 
              delay: 0.05 * (displayMessages.length - 1 - index),
              type: "spring",
              stiffness: 400,
              damping: 25
            }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="ghost"
              onClick={async () => {
                // Navigation disabled - stay in current chat panel
                // window.history.replaceState({}, '', `/chat/${chatId}`);

                append({
                  role: 'user',
                  content: message.action,
                });
              }}
              className={`group relative w-full h-auto p-0 hover:bg-primary/5 hover:shadow-blue transition-all duration-150 ${index < displayMessages.length - 1 ? 'border-b border-primary/10' : ''}`}
            >
              <div className="flex items-center gap-3 p-2.5 w-full">
                {/* Icon */}
                <motion.div 
                  className="flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 600, damping: 15 }}
                >
                  {getIconForSuggestion(message.title, index)}
                </motion.div>
                
                {/* Content */}
                <div className="flex-1 text-left space-y-0.5">
                  <div className="font-medium text-sm text-foreground/90 group-hover:text-foreground transition-colors duration-150">
                    {message.title}
                  </div>
                  <div className="text-xs text-muted-foreground/80 group-hover:text-muted-foreground transition-colors duration-150">
                    {message.label}
                  </div>
                </div>
                
                {/* Arrow icon */}
                <motion.div
                  className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 600, damping: 15 }}
                >
                  <ArrowRightIcon size={14} className="text-primary/80 dark:text-blue-400/80" />
                </motion.div>
              </div>
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

// Using memo to prevent unnecessary re-renders
export const SuggestedActions = memo(PureSuggestedActions);