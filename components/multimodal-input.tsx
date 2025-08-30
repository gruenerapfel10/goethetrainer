'use client';

import type { Attachment, UIMessage } from 'ai';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  memo,
} from 'react';
import { toast } from 'sonner';
import type { UseChatHelpers } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

interface MultimodalInputProps {
  selectedModelId: string;
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  selectedFiles?: any[];
  onSelectedFilesChange?: (files: any[]) => void;
  isDeepResearchEnabled?: boolean;
  onDeepResearchChange?: (enabled: boolean) => void;
  isFileSearchEnabled?: boolean;
  onFileSearchChange?: (enabled: boolean) => void;
  isWebSearchEnabled?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  isImageGenerationEnabled?: boolean;
  onImageGenerationChange?: (enabled: boolean) => void;
  onHeightChange?: (height: number) => void;
}

function PureMultimodalInput({
  selectedModelId,
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  selectedFiles = [],
  onSelectedFilesChange = () => {},
  isDeepResearchEnabled = false,
  onDeepResearchChange = () => {},
  isFileSearchEnabled = false,
  onFileSearchChange = () => {},
  isWebSearchEnabled = true,
  onWebSearchChange = () => {},
  isImageGenerationEnabled = false,
  onImageGenerationChange = () => {},
  onHeightChange = () => {},
}: MultimodalInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const submitForm = useCallback(() => {
    if (status === 'error') {
      toast.error('Cannot submit while there is an error. Please try again later.');
      return;
    }

    if (input.trim().length === 0) {
      toast.error('Please enter a message.');
      return;
    }

    handleSubmit();
    setInput('');
  }, [handleSubmit, input, setInput, status]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      
      if (status === 'error') {
        toast.error('Cannot submit while there is an error. Please try again later.');
      } else if (status !== 'ready') {
        toast.error('Please wait for the model to finish its response!');
      } else {
        submitForm();
      }
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      onHeightChange(textarea.scrollHeight + 32); // Add padding
    }
  }, [input, onHeightChange]);

  const canSubmit = input.trim().length > 0 && status === 'ready';
  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div className="relative w-full flex flex-col gap-2 max-w-3xl">
      <div className="flex flex-col gap-1.5">
        <div className="relative rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-border shadow-sm">
          <div className="relative px-3 pt-3 pb-2">
            <textarea
              ref={textareaRef}
              data-testid="multimodal-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Send a message..."
              className="w-full min-h-[40px] max-h-[200px] resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              rows={1}
            />
            
            <div className="flex flex-row items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {/* Feature toggles would go here */}
              </div>

              <Button
                onClick={isLoading ? stop : submitForm}
                disabled={!canSubmit && !isLoading}
                size="sm"
                className="rounded-full"
                variant={canSubmit || isLoading ? "default" : "ghost"}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput);