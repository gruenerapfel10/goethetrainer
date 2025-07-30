import type { Attachment } from 'ai';
import { toast } from 'sonner';

export const uploadFiles = async (
  files: FileList | File[],
  setUploadQueue: React.Dispatch<React.SetStateAction<Array<string>>>,
  setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>,
) => {
  const fileArray = Array.from(files);
  const currentUploadQueue = fileArray.map((file) => file.name);
  setUploadQueue((prev) => [...prev, ...currentUploadQueue]);

  try {
    const uploadPromises = fileArray.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          url: data.url,
          name: file.name,
          contentType: data.contentType || file.type,
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
};

const createImageFileFromBlob = async (blob: Blob): Promise<File> => {
  // Generate a unique filename with timestamp
  const timestamp = new Date().getTime();
  const filename = `pasted-image-${timestamp}.png`;
  
  // Create a new File object from the blob
  return new File([blob], filename, { type: blob.type });
};

export const handleClipboardPaste = async (
  e: ClipboardEvent,
  hasFileAttachment: boolean,
  status: string,
  uploadFiles: (files: FileList | File[]) => Promise<void>,
) => {
  if (!hasFileAttachment || status !== 'ready') return;

  const items = Array.from(e.clipboardData?.items || []);
  
  // Handle image items specifically
  const imageItems = items.filter(item => 
    item.type.startsWith('image/') && item.kind === 'file'
  );
  
  if (imageItems.length > 0) {
    e.preventDefault();
    const imageFiles = await Promise.all(
      imageItems
        .map(item => item.getAsFile())
        .filter(Boolean)
        .map(async (blob) => {
          if (!blob) return null;
          return createImageFileFromBlob(blob);
        })
    );

    const validImageFiles = imageFiles.filter(Boolean) as File[];
    
    if (validImageFiles.length > 0) {
      toast.success(
        `Pasting ${validImageFiles.length} image${validImageFiles.length > 1 ? 's' : ''}...`,
      );
      await uploadFiles(validImageFiles);
      return;
    }
  }

  // Handle other file types
  const fileItems = items.filter((item) => item.kind === 'file' && !item.type.startsWith('image/'));

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

    if (!hasFileAttachment || status !== 'ready') return;

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

    if (!hasFileAttachment || status !== 'ready') return;

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = async (e: DragEvent) => {
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
  };

  return {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
};