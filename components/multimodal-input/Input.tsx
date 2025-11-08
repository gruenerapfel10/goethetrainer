'use client';

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import { toast } from 'sonner';
import classNames from 'classnames';
import { useChat, AttachmentStatus } from '@/contexts/chat-context';
import { useMobileKeyboard } from '@/hooks/use-mobile-keyboard';
import { useWindowSize } from 'usehooks-ts';
import { CursorManager } from './cursor-manager';
import { APPLY_CHAT_INPUT_EVENT, type ApplyChatInputDetail } from '@/lib/chat/events';

export interface InputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  getCursorManager: () => CursorManager | null;
  getElement: () => HTMLDivElement | null;
}

interface InputProps {
  className?: string;
}

export const Input = forwardRef<InputRef, InputProps>(({
  className,
}, ref) => {
  const { status, attachments, input, setInput, sendMessage, messages } = useChat();
  const hasProcessingFiles = attachments.some(attachment => attachment.status === AttachmentStatus.UPLOADING);
  const { width } = useWindowSize();
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const cursorManagerRef = useRef<CursorManager | null>(null);
  const { isStickyInputBugged, stickyInputClass } = useMobileKeyboard();

  // Initialize cursor manager and focus on mount
  useEffect(() => {
    if (editorRef.current && !cursorManagerRef.current) {
      cursorManagerRef.current = new CursorManager(editorRef.current);
    } else if (editorRef.current && cursorManagerRef.current) {
      cursorManagerRef.current.setElement(editorRef.current);
    }
    
    // Focus the input on mount
    editorRef.current?.focus();
  }, []);


  // Build list of all available files for validation
  const allFiles = useMemo(() => {
    const files = new Set<string>();
    
    // Add current attachments
    attachments.forEach(a => a.name && files.add(a.name));
    
    // Add historical attachments from messages
    (messages || []).forEach((message: any) => {
      message.experimental_attachments?.forEach((attachment: any) => {
        if (attachment.name) files.add(attachment.name);
      });
    });
    
    return Array.from(files);
  }, [attachments, messages]);

  // Handle mention selection from FileMentions component
  useEffect(() => {
    const handleMentionSelect = (e: CustomEvent) => {
      const fileName = e.detail.fileName;
      if (!fileName || !editorRef.current || !cursorManagerRef.current) return;
      
      // Use cursor manager to insert mention pill with proper styling
      cursorManagerRef.current.insertMentionPill(fileName);
      setInput(cursorManagerRef.current.getTextContent());
      
      // Focus back on input
      editorRef.current.focus();
    };
    
    const handleMentionCancel = () => {
      editorRef.current?.focus();
    };
    
    window.addEventListener('mention-select', handleMentionSelect as EventListener);
    window.addEventListener('mention-cancel', handleMentionCancel);
    
    return () => {
      window.removeEventListener('mention-select', handleMentionSelect as EventListener);
      window.removeEventListener('mention-cancel', handleMentionCancel);
    };
  }, [setInput]);

  // Sync editor content with input state and highlight mentions
  useEffect(() => {
    if (editorRef.current && cursorManagerRef.current &&
      editorRef.current.innerText !== input && !isFocused) {
      // Create a map of valid file names for mention highlighting
      const fileMap = new Map<string, { url: string }>();
      allFiles.forEach(fileName => {
        fileMap.set(fileName, { url: '' }); // URL not needed for highlighting only
      });
      cursorManagerRef.current.syncHtmlFromText(input, fileMap);
    }
  }, [input, isFocused, allFiles]);

  // Text paste handler
  const handleTextPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const hasFiles = Array.from(e.clipboardData.items).some(
      item => item.kind === 'file'
    );

    if (hasFiles) return;

    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Keyboard handler
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && event.shiftKey) {
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari) {
        setTimeout(() => {
          const newText = editorRef.current?.innerText || '';
          setInput(newText);
        }, 0);
      }
    } else if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();

      if (status === 'streaming' || status === 'submitted') {
        toast.error('Please wait for the current message to complete.');
        return;
      }

      if (input.trim().length === 0 && attachments.length === 0) {
        toast.error('Please enter a message.');
        return;
      }

      sendMessage();
      // Clear and focus after sending
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      if (width && width > 768) {
        setTimeout(() => editorRef.current?.focus(), 100);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus();
    },
    blur: () => {
      editorRef.current?.blur();
    },
    clear: () => {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    },
    getCursorManager: () => {
      return cursorManagerRef.current;
    },
    getElement: () => {
      return editorRef.current;
    }
  }));

  return (
    <div
      data-testid="multimodal-input"
      ref={editorRef}
      contentEditable="true"
      onInput={(e) => {
        const text = e.currentTarget.textContent || '';
        setInput(text);
        
        // Check if we have completed mentions to highlight
        if (cursorManagerRef.current) {
          // Check if text contains any complete file mentions
          const hasCompleteMentions = allFiles.some(fileName => 
            text.includes(`@${fileName} `) || text.endsWith(`@${fileName}`)
          );
          
          if (hasCompleteMentions) {
            const fileMap = new Map<string, { url: string }>();
            allFiles.forEach(fileName => {
              fileMap.set(fileName, { url: '' });
            });
            requestAnimationFrame(() => {
              if (editorRef.current && cursorManagerRef.current) {
                const cursorPos = cursorManagerRef.current.getCursorPosition();
                cursorManagerRef.current.syncHtmlFromText(text, fileMap);
                cursorManagerRef.current.setCursorPosition(cursorPos);
              }
            });
          }
        }
      }}
      onPaste={handleTextPaste}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      data-placeholder={'Send a message...'}
      className={classNames(
        'relative w-full min-h-[40px] max-h-[400px] overflow-y-auto resize-none',
        'text-foreground caret-primary whitespace-pre-wrap break-words',
        'focus:outline-none',
        'scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent',
        !input &&
        'before:content-[attr(data-placeholder)] before:absolute before:text-muted-foreground/60 before:pointer-events-none',
        isStickyInputBugged && stickyInputClass,
        className,
      )}
      suppressContentEditableWarning={true}
    />
  );
});

Input.displayName = 'Input';
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<ApplyChatInputDetail>;
      const newText = custom.detail?.text ?? '';
      setInput(newText);
      if (cursorManagerRef.current && editorRef.current) {
        const fileMap = new Map<string, { url: string }>();
        allFiles.forEach(fileName => fileMap.set(fileName, { url: '' }));
        cursorManagerRef.current.syncHtmlFromText(newText, fileMap);
        requestAnimationFrame(() => {
          editorRef.current?.focus();
        });
      }
    };

    window.addEventListener(APPLY_CHAT_INPUT_EVENT, handler as EventListener);
    return () => window.removeEventListener(APPLY_CHAT_INPUT_EVENT, handler as EventListener);
  }, [setInput, allFiles]);
