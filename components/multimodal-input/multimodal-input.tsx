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
import { ArrowDown, } from 'lucide-react';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import classNames from 'classnames';

import { PreviewAttachment } from '@/components/preview-attachment';
import { Button } from '@/components/ui/button';
import { SuggestedActions } from '@/components/suggested-actions/suggested-actions';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FileMentionList } from '@/components/ui/file-mention-list';
import { FileSearch } from '@/components/file-search';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import type { FileSearchResult } from '@/components/chat-header';

import { CursorManager } from './cursor-manager';
import { AttachmentsButton } from './attachments-button';
import { SendButton } from './send-button';
import { StopButton } from './stop-button';
import {
  uploadFiles,
  handleClipboardPaste,
  createDragHandlers,
} from './file-handling';
import {
  FileDataManager,
  extractHistoricalFiles,
} from './mention-utils';
import { FeatureToggles } from './feature-toggles';
import { SettingsButton } from './settings-button';

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
  isWebSearchEnabled,
  onWebSearchChange,
  isImageGenerationEnabled,
  onImageGenerationChange,
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
  isWebSearchEnabled?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  isImageGenerationEnabled?: boolean;
  onImageGenerationChange?: (enabled: boolean) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { width } = useWindowSize();
  const hasFileAttachment =
    selectedModelId === 'general-bedrock-agent';

  // Extract historical files for backward compatibility
  const historicalFiles = useMemo(() => {
    return extractHistoricalFiles(messages, selectedFiles);
  }, [messages, selectedFiles]);

  // State
  const [isFocused, setIsFocused] = useState(false);
  const [mentionPopoverOpen, setMentionPopoverOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  // Initialize cursor manager
  useEffect(() => {
    if (editorRef.current && !cursorManagerRef.current) {
      cursorManagerRef.current = new CursorManager(editorRef.current);
    } else if (editorRef.current && cursorManagerRef.current) {
      cursorManagerRef.current.setElement(editorRef.current);
    }
  }, []);

  // Check if any files are currently processing
  const hasProcessingFiles = useMemo(() => {
    return processingFiles.length > 0;
  }, [processingFiles]);

  // File data manager for centralized file handling
  const fileDataManager = useMemo(() => {
    return new FileDataManager(attachments, messages, selectedFiles);
  }, [attachments, messages, selectedFiles]);

  // Filter files based on mention query
  const filteredFiles = useMemo(() => {
    return fileDataManager.filterFiles(mentionQuery);
  }, [fileDataManager, mentionQuery]);

  // File upload handler
  const handleUploadFiles = useCallback(
    (files: FileList | File[]) =>
      uploadFiles(files, setUploadQueue, setAttachments),
    [setAttachments],
  );

  // Drag and drop handlers
  const dragHandlers = useMemo(() => {
    return createDragHandlers(
      hasFileAttachment,
      status,
      setDragCounter,
      setIsDragOver,
      handleUploadFiles,
    );
  }, [hasFileAttachment, status, handleUploadFiles]);

  // Clipboard paste handler
  const handlePaste = useCallback(
    (e: ClipboardEvent) =>
      handleClipboardPaste(e, hasFileAttachment, status, handleUploadFiles),
    [hasFileAttachment, status, handleUploadFiles],
  );

  // Handle processing files change from FileSearch
  const handleProcessingFilesChange = (urls: string[]) => {
    setProcessingFiles(urls);
  };

  // Mention popover handler
  const handleMentionPopoverChange = (open: boolean) => {
    if (!open) {
      setMentionPopoverOpen(false);
    }
  };

  // File selection handler for mentions
  const handleFileSelect = (fileName: string) => {
    if (!cursorManagerRef.current) return;

    const fileUrl = fileDataManager.getFileUrl(fileName);
    cursorManagerRef.current.insertMentionPill(fileName, fileUrl);

    // Update input state
    setInput(cursorManagerRef.current.getTextContent());
    setMentionPopoverOpen(false);
    setMentionQuery('');
  };

  // Input handler
  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    const newText = event.currentTarget.textContent || '';
    setInput(newText);

    // Check for @ mentions
    if (cursorManagerRef.current) {
      const mentionContext = cursorManagerRef.current.getMentionContext();
      setMentionPopoverOpen(mentionContext.isTypingMention);
      setMentionQuery(mentionContext.query);
    }
  };

  // Text paste handler
  const handleTextPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Check if we have any files in the clipboard
    const hasFiles = Array.from(e.clipboardData.items).some(
      item => item.kind === 'file'
    );
    
    // If we have files, let the global paste handler handle it
    if (hasFiles) return;
    
    // Otherwise handle text paste
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Submit form handler
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

    // Navigation disabled - stay in current chat panel
    // window.history.replaceState({}, '', `/chat/${chatId}`);

    const currentInput = editorRef.current?.innerText ?? input;
    const textToSend = currentInput.replace(
      /@([^\s]+)/g,
      (match: string, fileName: string) => {
        const fileUrl = fileDataManager.getFileUrl(fileName);
        return fileUrl ? `@[${fileName}]` : match;
      },
    );

    /* FIXME(@ai-sdk-upgrade-v5): The `experimental_attachments` property has been replaced with the parts array. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#attachments--file-parts */
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
    fileDataManager,
    hasProcessingFiles,
    selectedFiles,
  ]);

  // File change handler
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (files) {
      await handleUploadFiles(files);
    }
  };

  // Delete attachment handler
  const handleDeleteAttachment = (attachmentToDelete: Attachment) => {
    setAttachments((currentAttachments) =>
      currentAttachments.filter(
        (attachment) => attachment.url !== attachmentToDelete.url,
      ),
    );
  };

  // Effects
  useEffect(() => {
    if (status === 'error') {
      toast.error('An error occurred. Please try again later.');
    }
  }, [status]);

  // Sync editor content with input state
  useEffect(() => {
    if (editorRef.current && cursorManagerRef.current && 
        editorRef.current.innerText !== input) {
      cursorManagerRef.current.syncHtmlFromText(input, fileDataManager.getFileMap());
    }
  }, [input, fileDataManager]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  useEffect(() => {
    if (mentionPopoverOpen) {
      setHighlightedIndex(0);
    }
  }, [mentionPopoverOpen, mentionQuery]);

  // Set up global event listeners for drag and drop and clipboard
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    document.addEventListener('paste', handlePaste);
    dropZone.addEventListener('dragenter', dragHandlers.handleDragEnter);
    dropZone.addEventListener('dragleave', dragHandlers.handleDragLeave);
    dropZone.addEventListener('dragover', dragHandlers.handleDragOver);
    dropZone.addEventListener('drop', dragHandlers.handleDrop);

    return () => {
      document.removeEventListener('paste', handlePaste);
      dropZone.removeEventListener('dragenter', dragHandlers.handleDragEnter);
      dropZone.removeEventListener('dragleave', dragHandlers.handleDragLeave);
      dropZone.removeEventListener('dragover', dragHandlers.handleDragOver);
      dropZone.removeEventListener('drop', dragHandlers.handleDrop);
    };
  }, [handlePaste, dragHandlers]);

  const { isAtBottom, scrollToBottom } = useScrollToBottom();

  useEffect(() => {
    if (status === 'submitted') {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  // Keyboard handler
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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

  // Container click handler
  const handleEditorContainerClick = async (
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
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

    if (e.target === e.currentTarget) {
      editorRef.current?.focus();
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
      className="relative w-full flex flex-col gap-2 max-w-3xl z-[1]"
      ref={inputContainerRef}
    >
      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute left-1/2 bottom-28 -translate-x-1/2 z-10"
          >
            <Button
              data-testid="scroll-to-bottom-button"
              className="rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-blue hover:shadow-blue-lg border-primary/20"
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
              className="flex flex-row gap-2 overflow-x-scroll items-end scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent bg-primary/5 rounded-xl p-2 border border-primary/10"
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
                'relative rounded-[14px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl transition-all duration-300 group',
                isDragOver && hasFileAttachment
                  ? 'border-2 border-dashed border-primary/40 bg-primary/10 shadow-blue-lg'
                  : 'border-0 shadow-blue',
                isFocused && !isDragOver
                  ? 'shadow-blue-lg ring-1 ring-primary/20 border-primary/20 bg-white/98 dark:bg-zinc-900/98'
                  : !isDragOver &&
                      'hover:shadow-blue-lg hover:ring-1 hover:ring-primary/10',
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
                  'absolute inset-0 rounded-[14px] opacity-0 transition-opacity duration-500',
                  'bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 blur-md',
                  isFocused && 'opacity-60',
                )}
              />

              <div className="relative px-3 pt-3 pb-2">
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
                    onPaste={handleTextPaste}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    data-placeholder={'Send a message...'}
                    className={classNames(
                      'w-full min-h-[40px] max-h-[400px] overflow-y-auto resize-none',
                      'text-foreground caret-primary whitespace-pre-wrap break-words',
                      'focus:outline-none',
                      'scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent',
                      !input &&
                        !isDragOver &&
                        'before:content-[attr(data-placeholder)] before:absolute before:text-muted-foreground/60 before:pointer-events-none',
                    )}
                    suppressContentEditableWarning={true}
                  />
                </div>

                <div className="flex flex-row items-center pt-3">
                  <div className="flex items-center gap-2">
                    <SettingsButton
                      status={status}
                      selectedModelId={selectedModelId}
                      isWebSearchEnabled={isWebSearchEnabled}
                      onWebSearchChange={onWebSearchChange}
                      isDeepResearchEnabled={isDeepResearchEnabled}
                      onDeepResearchChange={onDeepResearchChange}
                      isFileSearchEnabled={isFileSearchEnabled}
                      onFileSearchChange={onFileSearchChange}
                      isImageGenerationEnabled={isImageGenerationEnabled}
                      onImageGenerationChange={onImageGenerationChange}
                    />
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
            side="top"
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
    if (prevProps.isWebSearchEnabled !== nextProps.isWebSearchEnabled)
      return false;
    if (prevProps.isImageGenerationEnabled !== nextProps.isImageGenerationEnabled)
      return false;
    if (!equal(prevProps.selectedFiles, nextProps.selectedFiles)) return false;
    return true;
  },
);
