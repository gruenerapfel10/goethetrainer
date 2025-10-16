'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PreviewAttachment } from '@/components/preview-attachment';
import { useChat, AttachmentStatus, AttachmentType } from '@/contexts/chat-context';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { uploadFiles, createDragHandlers } from './AttachmentsButton';

type Attachment = {
  url?: string;
  name?: string;
  contentType?: string;
  size?: number;
  status?: AttachmentStatus;
};

export function AttachmentsDropOverlay() {
  const { 
    attachments, 
    setAttachments, 
    selectedModel,
    status 
  } = useChat();
  
  const supportsFileAttachments = selectedModel.supportsFileAttachments ?? true;
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Only show READY and UPLOADING attachments in the preview
  const previewAttachments = attachments.filter(a => 
    a.status === AttachmentStatus.READY || a.status === AttachmentStatus.UPLOADING
  );
  const hasAttachments = previewAttachments.length > 0;
  
  const handleUploadFiles = useCallback(
    (files: FileList | File[]) =>
      uploadFiles(files, setAttachments),
    [setAttachments],
  );
  
  const dragHandlers = useMemo(() => {
    return createDragHandlers(
      supportsFileAttachments,
      status,
      setDragCounter,
      setIsDragOver,
      handleUploadFiles,
    );
  }, [supportsFileAttachments, status, handleUploadFiles]);
  
  const handleDeleteAttachment = useCallback((attachmentToDelete: Attachment) => {
    setAttachments(current => current.filter(attachment => attachment.url !== attachmentToDelete.url));
  }, [setAttachments]);
  
  useEffect(() => {
    // Find parent container element (the div that contains this component)
    const parentElement = dropZoneRef.current?.parentElement;
    if (!parentElement) return;

    parentElement.addEventListener('dragenter', dragHandlers.handleDragEnter);
    parentElement.addEventListener('dragleave', dragHandlers.handleDragLeave);
    parentElement.addEventListener('dragover', dragHandlers.handleDragOver);
    parentElement.addEventListener('drop', dragHandlers.handleDrop);

    return () => {
      parentElement.removeEventListener('dragenter', dragHandlers.handleDragEnter);
      parentElement.removeEventListener('dragleave', dragHandlers.handleDragLeave);
      parentElement.removeEventListener('dragover', dragHandlers.handleDragOver);
      parentElement.removeEventListener('drop', dragHandlers.handleDrop);
    };
  }, [dragHandlers]);

  return (
    <>
      {/* Hidden ref element to find parent */}
      <div ref={dropZoneRef} style={{ display: 'none' }} />
      
      {/* Drag Drop Overlay */}
      <AnimatePresence>
        {isDragOver && supportsFileAttachments && (
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

      {/* Attachments Preview */}
      <AnimatePresence>
        {hasAttachments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pt-3 pb-2"
            data-testid="attachments-preview"
          >
            {/* Separator line */}
            <div className="w-[calc(100%+24px)] h-px bg-border/50 mb-2 -mx-3" />

            <div className="flex flex-wrap gap-2">
              {previewAttachments.map((attachment, index) => ({
                key: attachment.url || attachment.name || index,
                delay: index * 0.02,
                content: (
                  <PreviewAttachment
                    attachment={attachment}
                    isCompact={true}
                    onDelete={handleDeleteAttachment}
                    allAttachments={previewAttachments}
                    isSearchFile={attachment.type === AttachmentType.KB_FILE}
                    isUploading={attachment.status === AttachmentStatus.UPLOADING}
                  />
                )
              })).map(({ key, delay, content }) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay, duration: 0.15, ease: 'easeOut' }}
                  className="w-20 h-20"
                >
                  {content}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}