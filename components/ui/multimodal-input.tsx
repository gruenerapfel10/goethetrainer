'use client';

import type { Attachment, UIMessage } from 'ai';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpIcon, PaperclipIcon, StopIcon, } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { SuggestedActions } from './suggested-actions/suggested-actions';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FileMentionList } from '@/components/ui/file-mention-list';
import { FileSearch } from '@/components/file-search';
import {
  FileIcon,
  LightbulbIcon,
  ArrowDown,
  Loader2,
} from 'lucide-react';
import { supportsFeature } from '@/lib/ai/model-capabilities';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import classNames from 'classnames';
import type { FileSearchResult } from './chat-header';

// Streamlined cursor management utility
class CursorManager {
  private element: HTMLElement | null = null;

  constructor(element: HTMLElement | null) {
    this.element = element;
  }

  // Get current cursor position
  getCursorPosition(): number {
    if (!this.element) return 0;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  }

  // Set cursor position
  setCursorPosition(position: number): void {
    console.log('[Cursor Debug] setCursorPosition called', {
      position,
      caller: new Error().stack?.split('\n')[2],
    });

    if (!this.element) return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    let currentPos = 0;

    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let node;
    while ((node = walker.nextNode())) {
      const textLength = node.textContent?.length || 0;
      if (currentPos + textLength >= position) {
        range.setStart(node, Math.max(0, position - currentPos));
        range.collapse(true);
        break;
      }
      currentPos += textLength;
    }

    // If we didn't find a position, set to end
    if (currentPos < position) {
      range.selectNodeContents(this.element);
      range.collapse(false);
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Get text before cursor for @ mention detection
  getTextBeforeCursor(): string {
    if (!this.element) return '';

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return '';

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString();
  }

  // Insert @ mention pill at current cursor position
  insertMentionPill(fileName: string, fileUrl?: string): void {
    console.log('[Cursor Debug] insertMentionPill called', {
      fileName,
      caller: new Error().stack?.split('\n')[2],
    });

    if (!this.element) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textBeforeCursor = this.getTextBeforeCursor();
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex === -1) return;

    // Find the @ symbol in the DOM and replace from there
    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let currentPos = 0;
    let node;
    while ((node = walker.nextNode())) {
      const textLength = node.textContent?.length || 0;
      if (currentPos + textLength > atIndex) {
        const offsetInNode = atIndex - currentPos;
        const endOffset = Math.min(
          textLength,
          offsetInNode + (textBeforeCursor.length - atIndex),
        );

        // Create mention pill
        const pill = document.createElement('span');
        pill.className =
          'bg-orange-200/50 dark:bg-orange-800/50 rounded-md px-1 cursor-pointer hover:underline';
        pill.setAttribute('data-mention', `@[${fileName}]`);
        pill.setAttribute('contenteditable', 'false');
        pill.textContent = `@${fileName}`;
        if (fileUrl) {
          pill.setAttribute('title', fileUrl);
        }

        // Replace the @ mention text with the pill
        const replaceRange = document.createRange();
        replaceRange.setStart(node, offsetInNode);
        replaceRange.setEnd(node, endOffset);
        replaceRange.deleteContents();
        replaceRange.insertNode(pill);

        // Add space after pill and set cursor there
        const spaceNode = document.createTextNode(' ');
        pill.after(spaceNode);

        const newRange = document.createRange();
        newRange.setStartAfter(spaceNode);
        newRange.collapse(true);

        selection.removeAllRanges();
        selection.addRange(newRange);

        break;
      }
      currentPos += textLength;
    }
  }
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
  className,
  isDeepResearchEnabled,
  onDeepResearchChange,
  isFileSearchEnabled,
  onFileSearchChange,
  selectedFiles = [],
  onSelectedFilesChange = () => {},
  onHeightChange = () => {},
}: {
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
  className?: string;
  isDeepResearchEnabled?: boolean;
  onDeepResearchChange?: (enabled: boolean) => void;
  isFileSearchEnabled?: boolean;
  onFileSearchChange?: (enabled: boolean) => void;
  selectedFiles?: FileSearchResult[];
  onSelectedFilesChange?: (
    files:
      | FileSearchResult[]
      | ((prev: FileSearchResult[]) => FileSearchResult[]),
  ) => void;
  onHeightChange?: (height: number) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const cursorManagerRef = useRef<CursorManager | null>(null);
  const { width } = useWindowSize();
  const hasFileAttachment =
    selectedModelId === 'general-bedrock-agent' ||
    selectedModelId === 'image-agent';
  const [isFocused, setIsFocused] = useState(false);
  const [mentionPopoverOpen, setMentionPopoverOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);
  const processingFilesRef = useRef<string[]>([]);

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Initialize cursor manager when editor ref is available
  useEffect(() => {
    if (editorRef.current) {
      cursorManagerRef.current = new CursorManager(editorRef.current);
    }
  }, [editorRef.current]);

  // Check if any files are currently processing
  const hasProcessingFiles = useMemo(() => {
    return processingFiles.length > 0;
  }, [processingFiles]);

  // Handle processing files change from FileSearch - use a stable reference
  const handleProcessingFilesChange = useCallback((urls: string[]) => {
    // Use ref to store the latest value
    if (JSON.stringify(processingFilesRef.current) !== JSON.stringify(urls)) {
      processingFilesRef.current = urls;
      // Use requestAnimationFrame to schedule update outside of render cycle
      requestAnimationFrame(() => {
        setProcessingFiles(urls);
      });
    }
  }, []);

  const handleMentionPopoverChange = useCallback((open: boolean) => {
    if (!open) {
      setMentionPopoverOpen(false);
    }
  }, []);

  // Extract all files that have been used in the chat history
  const historicalFiles = useMemo(() => {
    const allFiles = new Map<string, FileSearchResult>();

    // Add current selected files
    selectedFiles.forEach((file) => {
      allFiles.set(file.title, file);
    });

    // Extract ALL experimental_attachments from ALL messages in the chat
    messages.forEach((message) => {
      if (message.experimental_attachments) {
        message.experimental_attachments.forEach((attachment: any) => {
          if (attachment.name && attachment.url) {
            const fileSearchResult: FileSearchResult = {
              title: attachment.name,
              url: attachment.url,
              content: '', // Attachments don't have content excerpts
              sizeInBytes: 0,
            };
            allFiles.set(attachment.name, fileSearchResult);
          }
        });
      }
    });

    return Array.from(allFiles.values());
  }, [messages, selectedFiles]);

  const availableFiles = useMemo(() => {
    const fromAttachments = attachments
      .map((a) => a.name)
      .filter(Boolean) as string[];
    const fromHistoricalFiles = historicalFiles
      .map((f) => f.title)
      .filter(Boolean) as string[];
    return [...new Set([...fromAttachments, ...fromHistoricalFiles])];
  }, [attachments, historicalFiles]);

  const filteredFiles = useMemo(() => {
    if (!mentionQuery) {
      return availableFiles;
    }
    return availableFiles.filter((file) =>
      file.toLowerCase().startsWith(mentionQuery.toLowerCase()),
    );
  }, [availableFiles, mentionQuery]);

  useEffect(() => {
    if (mentionPopoverOpen) {
      setHighlightedIndex(0);
    }
  }, [mentionPopoverOpen, mentionQuery]);

  const fileMap = useMemo(() => {
    const map = new Map<string, { url: string }>();
    attachments.forEach((file) => {
      if (file.name) {
        map.set(file.name, { url: file.url });
      }
    });
    historicalFiles.forEach((file) => {
      if (file.title) {
        map.set(file.title, { url: file.url });
      }
    });
    return map;
  }, [attachments, historicalFiles]);

  // Simplified HTML generation - only for display, not cursor management
  const generateHtmlFromText = useCallback(
    (text: string) => {
      const parts = text.split(/(@\[[^\]]+\])/g);
      const fragment = document.createDocumentFragment();

      parts.forEach((part) => {
        const match = part.match(/@\[([^\]]+)\]/);
        if (match) {
          const fileName = match[1];
          const file = fileMap.get(fileName);
          const pill = document.createElement('span');
          pill.className =
            'bg-orange-200/50 dark:bg-orange-800/50 rounded-md px-1 cursor-pointer hover:underline';
          pill.setAttribute('data-mention', `@[${fileName}]`);
          pill.setAttribute('contenteditable', 'false');
          pill.textContent = `@${fileName}`;
          if (file?.url) {
            pill.setAttribute('title', file.url);
          }

          fragment.appendChild(pill);
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
      });

      const div = document.createElement('div');
      div.appendChild(fragment);
      return div.innerHTML;
    },
    [fileMap],
  );

  // Streamlined file selection handler
  const handleFileSelect = useCallback(
    (fileName: string) => {
      console.log('[Cursor Debug] handleFileSelect called', {
        fileName,
        caller: new Error().stack?.split('\n')[1],
      });

      if (!cursorManagerRef.current) return;

      const file = fileMap.get(fileName);
      cursorManagerRef.current.insertMentionPill(fileName, file?.url);

      // Update input state
      if (editorRef.current) {
        const newText = editorRef.current.innerText;
        setInput(newText);
      }

      setMentionPopoverOpen(false);
      setMentionQuery('');
    },
    [setInput, fileMap],
  );

  useEffect(() => {
    if (status === 'error') {
      toast.error('An error occurred. Please try again later.');
    }
  }, [status]);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  // Simplified input synchronization - preserve cursor position
  useEffect(() => {
    if (
      editorRef.current &&
      editorRef.current.innerText !== input &&
      cursorManagerRef.current
    ) {
      const currentCursorPos = cursorManagerRef.current.getCursorPosition();
      console.log('[Cursor Debug] Syncing input, preserving cursor at', {
        currentCursorPos,
        caller: 'input sync effect',
      });

      editorRef.current.innerHTML = generateHtmlFromText(input);

      // Restore cursor position after DOM update
      requestAnimationFrame(() => {
        if (cursorManagerRef.current) {
          cursorManagerRef.current.setCursorPosition(currentCursorPos);
        }
      });
    }
  }, [input, generateHtmlFromText]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  // File upload utility function
  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const currentUploadQueue = fileArray.map((file) => file.name);
      setUploadQueue((prev) => [...prev, ...currentUploadQueue]);

      try {
        const uploadPromises = fileArray.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch('/api/files/upload-search', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            return {
              url: data.url,
              name: file.name,
              contentType: data.contentType,
            } as Attachment;
          }
          const { error } = await response.json();
          toast.error(error);
          return null;
        });

        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment: Attachment | null): attachment is Attachment =>
            attachment !== null,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files:', error);
        toast.error('Failed to upload file, please try again!');
      } finally {
        setUploadQueue((prev) =>
          prev.filter((fileName) => !currentUploadQueue.includes(fileName)),
        );
      }
    },
    [setAttachments],
  );

  // Clipboard paste handler for files
  const handleClipboardPaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!hasFileAttachment || status !== 'ready') return;

      const items = Array.from(e.clipboardData?.items || []);
      const fileItems = items.filter((item) => item.kind === 'file');

      if (fileItems.length > 0) {
        e.preventDefault();
        const files = fileItems
          .map((item) => item.getAsFile())
          .filter(Boolean) as File[];

        if (files.length > 0) {
          toast.success(
            `Pasting ${files.length} file${files.length > 1 ? 's' : ''}...`,
          );
          await uploadFiles(files);
        }
      }
    },
    [hasFileAttachment, status, uploadFiles],
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!hasFileAttachment || status !== 'ready') return;

      setDragCounter((prev) => prev + 1);

      if (e.dataTransfer?.types?.includes('Files')) {
        setIsDragOver(true);
      }
    },
    [hasFileAttachment, status],
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCounter((prev) => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!hasFileAttachment || status !== 'ready') return;

      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    [hasFileAttachment, status],
  );

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragOver(false);
      setDragCounter(0);

      if (!hasFileAttachment || status !== 'ready') return;

      const files = Array.from(e.dataTransfer?.files || []);

      if (files.length > 0) {
        toast.success(
          `Dropping ${files.length} file${files.length > 1 ? 's' : ''}...`,
        );
        await uploadFiles(files);
      }
    },
    [hasFileAttachment, status, uploadFiles],
  );

  // Set up global event listeners for drag and drop and clipboard
  useEffect(() => {
    const dropZone = dropZoneRef.current;

    if (!dropZone) return;

    // Add clipboard event listener to document
    document.addEventListener('paste', handleClipboardPaste);

    // Add drag and drop event listeners
    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('paste', handleClipboardPaste);
      dropZone.removeEventListener('dragenter', handleDragEnter);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, [
    handleClipboardPaste,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  ]);

  // Streamlined input handler
  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    console.log('[Cursor Debug] handleInput called', {
      selection: cursorManagerRef.current?.getCursorPosition(),
      text: event.currentTarget.textContent,
      caller: 'handleInput',
    });

    const newText = (event.currentTarget.textContent || '').trim();
    setInput(newText);

    // Check for @ mentions
    if (cursorManagerRef.current) {
      const textBeforeCursor = cursorManagerRef.current.getTextBeforeCursor();
      const atMatch = textBeforeCursor.match(/(?:\s|^)@([^\s]*)$/);

      if (atMatch) {
        setMentionPopoverOpen(true);
        setMentionQuery(atMatch[1]);
      } else {
        setMentionPopoverOpen(false);
        setMentionQuery('');
      }
    }
  };

  // Simplified paste handler for text
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    console.log('[Cursor Debug] handlePaste called', { caller: 'handlePaste' });
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    if (status === 'error') {
      toast.error(
        'Cannot submit while there is an error. Please try again later.',
      );
      return;
    }

    if (hasProcessingFiles) {
      toast.error(
        'Please wait for all files to finish processing before sending your message.',
      );
      return;
    }

    window.history.replaceState({}, '', `/chat/${chatId}`);

    const currentInput = editorRef.current?.innerText ?? input;
    const textToSend = currentInput.replace(
      /@([^\s]+)/g,
      (match: string, fileName: string) => {
        const file = fileMap.get(fileName);
        return file ? `@[${fileName}]` : match;
      },
    );

    handleSubmit(undefined, {
      experimental_attachments: attachments,
      body: {
        data: {
          input: textToSend,
          selectedFiles: selectedFiles,
        },
      },
    });

    setAttachments([]);
    setLocalStorageInput('');
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }

    if (width && width > 768) {
      editorRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    status,
    input,
    fileMap,
    hasProcessingFiles,
    selectedFiles,
  ]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        await uploadFiles(files);
      }
    },
    [uploadFiles],
  );

  const handleDeleteAttachment = useCallback(
    (attachmentToDelete: Attachment) => {
      setAttachments((currentAttachments) =>
        currentAttachments.filter(
          (attachment) => attachment.url !== attachmentToDelete.url,
        ),
      );
    },
    [setAttachments],
  );

  const { isAtBottom, scrollToBottom } = useScrollToBottom();

  useEffect(() => {
    if (status === 'submitted') {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    console.log('[Cursor Debug] handleKeyDown', {
      key: event.key,
      selection: cursorManagerRef.current?.getCursorPosition(),
      text: event.currentTarget.textContent,
    });
    const popoverIsOpen = mentionPopoverOpen && filteredFiles.length > 0;

    if (popoverIsOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredFiles.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex(
          (prev) => (prev - 1 + filteredFiles.length) % filteredFiles.length,
        );
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const selectedFileName = filteredFiles[highlightedIndex];
        if (selectedFileName) {
          handleFileSelect(selectedFileName);
        }
      }
    } else if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();

      if (input.trim().length === 0) {
        toast.error('Please enter a message.');
        return;
      }

      if (status === 'error') {
        toast.error(
          'Cannot submit while there is an error. Please try again later.',
        );
      } else if (status !== 'ready') {
        toast.error('Please wait for the model to finish its response!');
      } else if (hasProcessingFiles) {
        toast.error(
          'Please wait for all files to finish processing before sending your message.',
        );
      } else {
        submitForm();
      }
    }
  };

  // Streamlined container click handler
  const handleEditorContainerClick = async (
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    console.log('[Cursor Debug] handleEditorContainerClick', {
      target: e.target,
      currentTarget: e.currentTarget,
      selection: cursorManagerRef.current?.getCursorPosition(),
      caller: 'handleEditorContainerClick',
    });
    const target = e.target as HTMLElement;

    if (target.tagName === 'SPAN' && target.dataset.mention) {
      e.preventDefault();
      const fileUrl = target.getAttribute('title');
      if (fileUrl) {
        try {
          const response = await fetch('/api/files/presigned-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ s3Url: fileUrl }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.presignedUrl) {
              window.open(data.presignedUrl, '_blank', 'noopener,noreferrer');
            }
          } else {
            console.error('Failed to get presigned URL for mention');
          }
        } catch (error) {
          console.error('Error fetching presigned URL for mention:', error);
        }
      }
      return;
    }

    // Simplified focus and cursor positioning
    if (e.target === e.currentTarget) {
      editorRef.current?.focus();
      if (cursorManagerRef.current) {
        // Set cursor to end of content
        const contentLength = editorRef.current?.innerText?.length || 0;
        cursorManagerRef.current.setCursorPosition(contentLength);
      }
    }
  };

  // Use ResizeObserver to track the input container height
  useEffect(() => {
    const inputContainer = inputContainerRef.current;
    if (!inputContainer) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        onHeightChange(height);
      }
    });

    resizeObserver.observe(inputContainer);
    return () => resizeObserver.disconnect();
  }, [onHeightChange]);

  return (
    <div
      className="relative w-full flex flex-col gap-2 max-w-3xl z-[10]"
      ref={inputContainerRef}
    >
      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute left-1/2 bottom-28 -translate-x-1/2 z-50"
          >
            <Button
              data-testid="scroll-to-bottom-button"
              className="rounded-full"
              size="icon"
              variant="outline"
              onClick={(event) => {
                event.preventDefault();
                scrollToBottom();
              }}
            >
              <ArrowDown />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <SuggestedActions
              append={append}
              chatId={chatId}
              selectedModelId={selectedModelId}
            />
          </motion.div>
        )}

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      <div className="flex flex-col gap-1.5" ref={dropZoneRef}>
        <AnimatePresence>
          {(attachments.length > 0 || uploadQueue.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              data-testid="attachments-preview"
              className="flex flex-row gap-2 overflow-x-scroll items-end scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent bg-muted/30 rounded-xl p-2"
            >
              {attachments.map((attachment, index) => (
                <motion.div
                  key={attachment.url}
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                  }}
                  className="shrink-0"
                >
                  <PreviewAttachment
                    attachment={attachment}
                    isCompact={true}
                    onDelete={handleDeleteAttachment}
                  />
                </motion.div>
              ))}

              {uploadQueue.map((filename, index) => (
                <motion.div
                  key={filename}
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: (attachments.length + index) * 0.05,
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                  }}
                  className="shrink-0"
                >
                  <PreviewAttachment
                    attachment={{
                      url: '',
                      name: filename,
                      contentType: '',
                    }}
                    isUploading={true}
                    isCompact={true}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isFileSearchEnabled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="w-full"
            >
              <FileSearch
                selectedFiles={selectedFiles}
                onSelectedFilesChange={onSelectedFilesChange}
                isCompact={true}
                onProcessingFilesChange={handleProcessingFilesChange}
                key="file-search"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Popover
          open={mentionPopoverOpen}
          onOpenChange={handleMentionPopoverChange}
        >
          <PopoverTrigger asChild>
            <motion.div
              className={classNames(
                'relative rounded-[14px] bg-background/90 backdrop-blur-sm transition-all duration-300 group',
                isDragOver && hasFileAttachment
                  ? 'border-2 border-dashed border-muted-foreground/40 bg-muted/20 shadow-lg'
                  : 'border border-border/50',
                isFocused && !isDragOver
                  ? 'shadow-xl shadow-orange-500/5 ring-1 ring-orange-500/10 border-orange-500/20 bg-background/95'
                  : !isDragOver &&
                      'shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/5 hover:border-border/70',
                className,
              )}
              animate={{
                scale: isFocused ? 1.003 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              whileHover={{ scale: 1.001 }}
            >
              <div
                className={classNames(
                  'absolute inset-0 rounded-[32px] opacity-0 transition-opacity duration-500',
                  'bg-gradient-to-r from-orange-500/5 via-primary/5 to-orange-500/5 blur-md',
                  isFocused && 'opacity-70',
                )}
              />

              <div className="relative p-3">
                <div className="relative" onClick={handleEditorContainerClick}>
                  {/* Drag indicator */}
                  <AnimatePresence>
                    {isDragOver && hasFileAttachment && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="absolute inset-0 z-10 flex items-center justify-center rounded-lg"
                      >
                        <motion.div
                          className="flex items-center gap-3 text-muted-foreground"
                          initial={{ y: 5, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/50 flex items-center justify-center">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              className="text-muted-foreground"
                            >
                              <path
                                d="M6 1v10M1 6h10"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                          <span className="font-medium text-base">
                            Drop files here to add as attachments
                          </span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div
                    data-testid="multimodal-input"
                    ref={editorRef}
                    contentEditable="true"
                    onInput={handleInput}
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    data-placeholder={'Send a message...'}
                    className={classNames(
                      'w-full min-h-[24px] max-h-[400px] overflow-y-auto resize-none',
                      'text-foreground caret-primary whitespace-pre-wrap break-words',
                      'focus:outline-none',
                      'scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent',
                      !input &&
                        !isDragOver &&
                        'before:content-[attr(data-placeholder)] before:absolute before:text-muted-foreground/60 before:pointer-events-none',
                    )}
                    suppressContentEditableWarning={true}
                  />
                </div>

                <div className="flex flex-row pt-4">
                  <div className="flex items-center gap-2">
                    {hasFileAttachment && (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ opacity: isDragOver ? 0 : 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <AttachmentsButton
                          fileInputRef={fileInputRef}
                          status={status}
                        />
                      </motion.div>
                    )}
                  </div>

                  <div className="flex items-end gap-2">
                    {supportsFeature(selectedModelId, 'deepResearch') && (
                      <motion.div
                        className="flex items-center gap-1"
                        initial={{ opacity: 0, x: -20, scale: 0.9 }}
                        animate={{
                          opacity: isDragOver ? 0 : 1,
                          x: 0,
                          scale: 1,
                        }}
                        exit={{ opacity: 0, x: -20, scale: 0.9 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 25,
                          opacity: { duration: 0.2 },
                        }}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onDeepResearchChange?.(!isDeepResearchEnabled)
                          }
                          className={classNames(
                            'flex items-center gap-2 text-xs font-medium rounded-[10px] px-3.5 py-2 transition-colors border',
                            isDeepResearchEnabled
                              ? 'bg-foreground text-background border-transparent shadow-lg shadow-foreground/20 hover:bg-foreground hover:border-transparent hover:text-background'
                              : 'bg-background text-foreground border-border/80 hover:bg-background hover:border-border/80 hover:text-foreground',
                          )}
                        >
                          <motion.div
                            className="flex items-center gap-2"
                            whileHover={{ scale: 1.05 }}
                            transition={{
                              type: 'spring',
                              stiffness: 400,
                              damping: 17,
                            }}
                          >
                            <LightbulbIcon
                              size={14}
                              className={classNames(
                                'transition-colors',
                                isDeepResearchEnabled
                                  ? 'text-background'
                                  : 'text-foreground',
                              )}
                            />
                            <span>Deep Research</span>
                          </motion.div>
                        </Button>
                      </motion.div>
                    )}
                    {supportsFeature(selectedModelId, 'fileSearch') && (
                      <motion.div
                        className="flex items-center gap-1"
                        initial={{ opacity: 0, x: -20, scale: 0.9 }}
                        animate={{
                          opacity: isDragOver ? 0 : 1,
                          x: 0,
                          scale: 1,
                        }}
                        exit={{ opacity: 0, x: -20, scale: 0.9 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 25,
                          opacity: { duration: 0.2 },
                        }}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onFileSearchChange?.(!isFileSearchEnabled)
                          }
                          className={classNames(
                            'flex items-center gap-2 text-xs font-medium rounded-[10px] px-3.5 py-2 transition-colors border',
                            isFileSearchEnabled
                              ? 'bg-foreground text-background border-transparent shadow-lg shadow-foreground/20 hover:bg-foreground hover:border-transparent hover:text-background'
                              : 'bg-background text-foreground border-border/80 hover:bg-background hover:border-border/80 hover:text-foreground',
                          )}
                        >
                          <motion.div
                            className="flex items-center gap-2"
                            whileHover={{ scale: 1.05 }}
                            transition={{
                              type: 'spring',
                              stiffness: 400,
                              damping: 17,
                            }}
                          >
                            <FileIcon
                              size={14}
                              className={classNames(
                                'transition-colors',
                                isFileSearchEnabled
                                  ? 'text-background'
                                  : 'text-foreground',
                              )}
                            />
                            <span>File Search</span>
                          </motion.div>
                        </Button>
                      </motion.div>
                    )}
                  </div>

                  <motion.div
                    className="ml-auto"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ opacity: isDragOver ? 0 : 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                      opacity: { duration: 0.2 },
                    }}
                  >
                    {status === 'submitted' || status === 'streaming' ? (
                      <StopButton stop={stop} setMessages={setMessages} />
                    ) : (
                      <SendButton
                        input={input}
                        submitForm={submitForm}
                        uploadQueue={uploadQueue}
                        status={status}
                        hasProcessingFiles={hasProcessingFiles}
                      />
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] max-h-60 overflow-y-auto p-0"
            align="start"
            onOpenAutoFocus={(e: Event) => e.preventDefault()}
          >
            <FileMentionList
              files={filteredFiles}
              highlightedIndex={highlightedIndex}
              setHighlightedIndex={setHighlightedIndex}
              onSelect={handleFileSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.selectedModelId, nextProps.selectedModelId))
      return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.isDeepResearchEnabled !== nextProps.isDeepResearchEnabled)
      return false;
    if (prevProps.isFileSearchEnabled !== nextProps.isFileSearchEnabled)
      return false;
    if (!equal(prevProps.selectedFiles, nextProps.selectedFiles)) return false;
    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
}) {
  return (
    <Button
      data-testid="attachments-button"
      className={classNames(
        'rounded-[10px] p-2.5 h-fit transition-all duration-300 group relative overflow-hidden',
        'bg-muted/50 hover:bg-muted/80 border border-border/30 hover:border-border/50',
        'shadow-sm hover:shadow-md',
        status !== 'ready' && 'opacity-50 cursor-not-allowed',
      )}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
      title="Upload files (or drag & drop / Ctrl+V)"
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <PaperclipIcon
          size={16}
          className="text-foreground/70 group-hover:text-foreground transition-colors"
        />
      </motion.div>
      <div className="absolute inset-0 rounded-[10px] bg-orange-500/10 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300" />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
  status,
  hasProcessingFiles,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
  status: UseChatHelpers['status'];
  hasProcessingFiles: boolean;
}) {
  const isDisabled =
    input.length === 0 ||
    uploadQueue.length > 0 ||
    status === 'error' ||
    hasProcessingFiles;
  const isActive = !isDisabled && input.length > 0;
  const isProcessing = hasProcessingFiles && input.length > 0;

  return (
    <Button
      data-testid="send-button"
      className={classNames(
        'rounded-[14px] p-3 h-fit transition-all duration-300 group relative overflow-hidden',
        isDisabled && !isProcessing
          ? 'bg-muted/30 border border-border/20 cursor-not-allowed'
          : isProcessing
          ? 'bg-amber-500/70 border border-amber-300/50 cursor-not-allowed shadow-md hover:shadow-lg hover:shadow-amber-500/20'
          : 'bg-primary hover:bg-primary/90 border border-primary/20 hover:border-primary/30 shadow-md hover:shadow-lg hover:shadow-primary/10',
      )}
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={isDisabled}
      title={
        hasProcessingFiles
          ? 'Please wait for files to finish processing before sending'
          : undefined
      }
    >
      {isProcessing ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
        >
          <Loader2 size={16} className="text-amber-900" />
        </motion.div>
      ) : (
        <motion.div
          animate={isActive ? { rotate: 45 } : { rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <ArrowUpIcon
            size={16}
            className={classNames(
              'transition-colors duration-300 bg-transparent',
              isDisabled ? 'text-muted-foreground' : 'text-primary-foreground',
            )}
          />
        </motion.div>
      )}

      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-[14px] bg-primary/20"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
        />
      )}
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.hasProcessingFiles !== nextProps.hasProcessingFiles)
    return false;
  // Check if processing state changed (input + hasProcessingFiles)
  const prevIsProcessing =
    prevProps.hasProcessingFiles && prevProps.input.length > 0;
  const nextIsProcessing =
    nextProps.hasProcessingFiles && nextProps.input.length > 0;
  if (prevIsProcessing !== nextIsProcessing) return false;
  return true;
});

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className={classNames(
        'rounded-[14px] p-3 h-fit transition-all duration-300 group relative overflow-hidden',
        'bg-foreground text-background border border-transparent',
        'shadow-md hover:shadow-lg hover:shadow-foreground/10',
      )}
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <StopIcon size={16} className="text-background" />
      </motion.div>
      <motion.div
        className="absolute inset-0 rounded-[14px] bg-foreground/20"
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0, 0.2] }}
        transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
      />
    </Button>
  );
}

const StopButton = memo(PureStopButton);
