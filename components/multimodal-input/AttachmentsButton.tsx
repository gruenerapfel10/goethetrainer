'use client';

import { memo, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { PaperclipIcon } from '@/components/icons';
import classNames from 'classnames';
import { toast } from 'sonner';
import { useChat, AttachmentStatus, AttachmentType } from '@/contexts/chat-context';

type Attachment = {
  url?: string;
  name?: string;
  contentType?: string;
  size?: number;
  status?: AttachmentStatus;
  type?: AttachmentType;
  content?: string;
  thumbnailUrl?: string;
  metadata?: any;
};

export interface FileUploadHandlerRef {
  triggerFileSelect: () => void;
}

interface AttachmentsButtonProps {
  // No props needed - everything comes from context
}

// File upload functions
export const uploadFiles = async (
  files: FileList | File[],
  setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>,
) => {
  const fileArray = Array.from(files);
  console.log('[AttachmentsButton] Starting file upload for', fileArray.length, 'files:', fileArray.map(f => f.name));
  
  // Create uploading attachments immediately for optimistic UI
  const uploadingAttachments: Attachment[] = fileArray.map((file) => ({
    url: '',
    name: file.name,
    contentType: file.type,
    size: file.size,
    status: AttachmentStatus.UPLOADING,
    type: AttachmentType.USER_FILE,
  }));
  
  // Add uploading attachments to state immediately
  setAttachments((prev) => [...prev, ...uploadingAttachments]);

  try {
    const uploadPromises = fileArray.map(async (file) => {
      console.log(`[AttachmentsButton] Uploading file: ${file.name} (${file.size} bytes, type: ${file.type})`);
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        console.log(`[AttachmentsButton] Upload response status for ${file.name}:`, response.status);

        if (response.ok) {
          const data = await response.json();
          console.log(`[AttachmentsButton] Upload successful for ${file.name}, URL:`, data.url);
          
          // Update the uploading attachment to ready state
          setAttachments((currentAttachments) =>
            currentAttachments.map((attachment) =>
              attachment.name === file.name && attachment.status === AttachmentStatus.UPLOADING
                ? {
                    ...attachment,
                    url: data.url,
                    contentType: data.contentType || file.type,
                    status: AttachmentStatus.READY,
                    type: AttachmentType.USER_FILE,
                  }
                : attachment
            )
          );
          
          return true;
        }
        
        const { error } = await response.json();
        console.error(`[AttachmentsButton] Upload failed for ${file.name}:`, error);
        toast.error(error);
        
        // Update the processing attachment to error state
        setAttachments((currentAttachments) =>
          currentAttachments.map((attachment) =>
            attachment.name === file.name && attachment.status === AttachmentStatus.UPLOADING
              ? {
                  ...attachment,
                  status: AttachmentStatus.ERROR,
                }
              : attachment
          )
        );
        
        return false;
      } catch (fileError) {
        console.error(`Error uploading file ${file.name}:`, fileError);
        toast.error(`Failed to upload ${file.name}`);
        
        // Update the processing attachment to error state
        setAttachments((currentAttachments) =>
          currentAttachments.map((attachment) =>
            attachment.name === file.name && attachment.status === AttachmentStatus.UPLOADING
              ? {
                  ...attachment,
                  status: AttachmentStatus.ERROR,
                }
              : attachment
          )
        );
        
        return false;
      }
    });

    await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading files:', error);
    toast.error('Failed to upload files, please try again!');
    
    // Set any remaining uploading attachments to error state
    setAttachments((currentAttachments) =>
      currentAttachments.map((attachment) =>
        attachment.status === AttachmentStatus.UPLOADING
          ? {
              ...attachment,
              status: AttachmentStatus.ERROR,
            }
          : attachment
      )
    );
  }
};

const createImageFileFromBlob = async (blob: Blob): Promise<File> => {
  const timestamp = new Date().getTime();
  const filename = `pasted-image-${timestamp}.png`;
  return new File([blob], filename, { type: blob.type });
};

export const handleClipboardPaste = async (
  e: ClipboardEvent,
  hasFileAttachment: boolean,
  status: string,
  uploadFiles: (files: FileList | File[]) => Promise<void>,
) => {
  if (!hasFileAttachment) return;

  const items = Array.from(e.clipboardData?.items || []);

  const imageItems = items.filter(
    (item) => item.type.startsWith('image/') && item.kind === 'file',
  );

  if (imageItems.length > 0) {
    e.preventDefault();
    const imageFiles = await Promise.all(
      imageItems
        .map((item) => item.getAsFile())
        .filter(Boolean)
        .map(async (blob) => {
          if (!blob) return null;
          return createImageFileFromBlob(blob);
        }),
    );

    const validImageFiles = imageFiles.filter(Boolean) as File[];

    if (validImageFiles.length > 0) {
      toast.success(
        `Pasting ${validImageFiles.length} image${
          validImageFiles.length > 1 ? 's' : ''
        }...`,
      );
      await uploadFiles(validImageFiles);
      return;
    }
  }

  const fileItems = items.filter(
    (item) => item.kind === 'file' && !item.type.startsWith('image/'),
  );

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
};

export const createDragHandlers = (
  hasFileAttachment: boolean,
  status: string,
  setDragCounter: React.Dispatch<React.SetStateAction<number>>,
  setIsDragOver: React.Dispatch<React.SetStateAction<boolean>>,
  uploadFiles: (files: FileList | File[]) => Promise<void>,
) => {
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasFileAttachment) return;

    setDragCounter((prev) => prev + 1);

    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCounter((prev) => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasFileAttachment) return;

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragOver(false);
    setDragCounter(0);

    if (!hasFileAttachment) return;

    const files = Array.from(e.dataTransfer?.files || []);

    if (files.length > 0) {
      toast.success(
        `Dropping ${files.length} file${files.length > 1 ? 's' : ''}...`,
      );
      await uploadFiles(files);
    }
  };

  return {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
};

function PureAttachmentsButton({}: AttachmentsButtonProps) {
  const { status, setAttachments, selectedModel } = useChat();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const supportsFileAttachments = selectedModel.supportsFileAttachments ?? true;

  const handleUploadFiles = useCallback(
    (files: FileList | File[]) =>
      uploadFiles(files, setAttachments),
    [setAttachments],
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      await handleUploadFiles(files);
    }
  };

  // Don't render anything if file attachments aren't supported
  // But we must call all hooks first to satisfy React's rules
  return supportsFileAttachments ? (
    <>
      <button
        data-testid="attachments-button"
        className={classNames(
          'inline-flex items-center justify-center rounded-md p-2 h-8 w-8',
          'text-muted-foreground hover:text-foreground',
          'bg-transparent hover:bg-muted/20 border-0',
          'transition-all duration-200 ease-in-out',
          'hover:scale-105 active:scale-95',
        )}
        onClick={(event) => {
          event.preventDefault();
          fileInputRef.current?.click();
        }}
        title="Attach files"
        type="button"
      >
        <PaperclipIcon size={16} />
      </button>
      
      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />
    </>
  ) : null;
}

export const AttachmentsButton = memo(PureAttachmentsButton);

export const FileUploadHandler = forwardRef<FileUploadHandlerRef, {}>(
  ({}, ref) => {
    const { setAttachments } = useChat();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadFiles = useCallback(
      (files: FileList | File[]) =>
        uploadFiles(files, setAttachments),
      [setAttachments],
    );

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        await handleUploadFiles(files);
      }
    };

    useImperativeHandle(ref, () => ({
      triggerFileSelect: () => {
        fileInputRef.current?.click();
      }
    }));

    return (
      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />
    );
  }
);