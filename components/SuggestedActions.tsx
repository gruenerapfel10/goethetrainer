'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import type { ChatRequestOptions, UIMessage } from 'ai';
import { memo } from 'react';
import { useChat } from '@/contexts/chat-context';
import { useTranslations } from 'next-intl';
import { 
  FileTextIcon, 
  CalendarIcon, 
  BrainCircuitIcon, 
  MessageSquareIcon,
  LightbulbIcon,
  TrendingUpIcon,
  SearchIcon,
  UsersIcon,
  ArrowRightIcon
} from 'lucide-react';

// Action suggestion data type
export interface SuggestedAction {
  title: string;
  label: string;
  action: string;
  // Translation keys for i18n (optional - fallback to title/label/action if not provided)
  titleKey?: string;
  labelKey?: string;
  actionKey?: string;
}

// Icon mapping for different suggestion types
const getIconForSuggestion = (title: string, index: number) => {
  const iconProps = { size: 20, className: "text-primary/80" };
  
  // Map based on keywords in the title
  const titleLower = title.toLowerCase();
  if (titleLower.includes('proposal')) return <FileTextIcon key="proposal" {...iconProps} />;
  if (titleLower.includes('timeline')) return <CalendarIcon key="timeline" {...iconProps} />;
  if (titleLower.includes('campaign') || titleLower.includes('brainstorm')) return <LightbulbIcon key="campaign" {...iconProps} />;
  if (titleLower.includes('response') || titleLower.includes('draft')) return <MessageSquareIcon key="response" {...iconProps} />;
  if (titleLower.includes('trend') || titleLower.includes('analysis')) return <TrendingUpIcon key="trend" {...iconProps} />;
  if (titleLower.includes('search') || titleLower.includes('find')) return <SearchIcon key="search" {...iconProps} />;
  if (titleLower.includes('competitive') || titleLower.includes('market')) return <UsersIcon key="market" {...iconProps} />;
  
  // Fallback icons based on index
  const fallbackIcons = [
    <BrainCircuitIcon key="fallback-brain" {...iconProps} />,
    <LightbulbIcon key="fallback-light" {...iconProps} />,
    <TrendingUpIcon key="fallback-trend" {...iconProps} />,
    <MessageSquareIcon key="fallback-message" {...iconProps} />
  ];
  
  return fallbackIcons[index % fallbackIcons.length];
};

interface SuggestedActionsProps {}

function PureSuggestedActions({}: SuggestedActionsProps) {
  const { selectedModel, sendMessage, setInput, id: chatId, messages, attachments, status } = useChat();
  const t = useTranslations();
  
  const show = messages.length === 0 && attachments.length === 0 && status === 'ready';

  // Limit the number of messages to show (between 1 and 4)
  const displayMessages = selectedModel.suggestedActions.slice(0, 4);

  if (!show || displayMessages.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
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
              onClick={(event) => {
                event.preventDefault();
                window.history.replaceState({}, '', `/chat/${chatId}`);
                const actionText = (message.actionKey && t) ? t(message.actionKey) : message.action;
                
                const inputElement = document.querySelector('[data-testid="multimodal-input"]') as HTMLDivElement;
                if (inputElement) {
                  inputElement.textContent = actionText;
                  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                  
                  setTimeout(() => {
                    const sendButton = document.querySelector('[data-testid="send-button"]') as HTMLButtonElement;
                    if (sendButton && !sendButton.disabled) {
                      sendButton.click();
                    }
                  }, 100);
                }
              }}
              className={`group relative w-full h-auto p-0 hover:bg-accent/50 transition-all duration-150 ${index < displayMessages.length - 1 ? 'border-b border-border/10' : ''}`}
            >
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 w-full">
                {/* Icon */}
                <motion.div 
                  className="flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 600, damping: 15 }}
                >
                  {getIconForSuggestion(message.title, index)}
                </motion.div>
                
                {/* Content */}
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-foreground group-hover:text-foreground transition-colors duration-150 leading-tight">
                    {(message.titleKey && t) ? t(message.titleKey) : message.title}
                  </div>
                  <div className="text-xs text-muted-foreground/90 group-hover:text-muted-foreground transition-colors duration-150 leading-tight mt-0.5">
                    {(message.labelKey && t) ? t(message.labelKey) : message.label}
                  </div>
                </div>
                
                {/* Arrow icon */}
                <motion.div
                  className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 600, damping: 15 }}
                >
                  <ArrowRightIcon size={14} className="text-primary/80" />
                </motion.div>
              </div>
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Using memo to prevent unnecessary re-renders
export const SuggestedActions = memo(PureSuggestedActions);