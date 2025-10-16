import type { Attachment } from '@/lib/ai/chat-manager';
import { FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2, XIcon, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FilePreviewModal } from './file-preview-modal';

export function PreviewAttachment({
  attachment,
  isUploading = false,
  isCompact = false,
  onDelete,
  allAttachments = [],
  isSearchFile = false,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  isCompact?: boolean;
  onDelete?: (attachment: Attachment) => void;
  allAttachments?: Attachment[];
  isSearchFile?: boolean;
}) {
  const { name, url, contentType } = attachment;
  const isImage = contentType?.startsWith('image/');
  const isPdf = contentType?.includes('pdf') || name?.toLowerCase().endsWith('.pdf');
  const isDocx = contentType?.includes('wordprocessingml') || name?.toLowerCase().endsWith('.docx');
  const extension = name?.split('.').pop()?.toUpperCase() || '';
  const truncatedName =
    name && name.length > 15 ? `${name.slice(0, 12)}...` : name;

  const [isDeleting, setIsDeleting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch presigned URL for images
  useEffect(() => {
    if (isImage && url && !isUploading) {
      setImageLoading(true);
      fetch('/api/files/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Url: url }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.presignedUrl) {
            setImageUrl(data.presignedUrl);
          }
        })
        .catch((error) => {
          console.error('Error fetching presigned URL for image:', error);
        })
        .finally(() => {
          setImageLoading(false);
        });
    }
  }, [isImage, url, isUploading]);

  const handleOpenFile = async (e: any) => {
    e.stopPropagation();
    e.preventDefault();

    if (isUploading || !url) return;

    try {
      const response = await fetch('/api/files/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Url: url }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.presignedUrl) {
          window.open(data.presignedUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        console.error('Failed to get presigned URL');
        toast.error('Failed to open file');
      }
    } catch (error) {
      console.error('Error fetching presigned URL:', error);
      toast.error('Error opening file');
    }
  };

  const handleDeleteFile = async (e: any) => {
    e.stopPropagation();
    e.preventDefault();

    if (isUploading || isDeleting || !url) return;

    setIsDeleting(true);

    try {
      const response = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Url: url }),
      });

      if (response.ok) {
        // Call the onDelete callback to remove from attachments array
        onDelete?.(attachment);
        toast.success('File deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to delete file:', errorData);
        toast.error('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Error deleting file');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'group relative rounded-lg border overflow-hidden cursor-pointer flex flex-col pt-2',
          'bg-gradient-to-b from-card to-card/50',
          'hover:bg-accent/5 hover:shadow-md',
          'transform transition-all duration-200',
          'hover:scale-[1.02] hover:-translate-y-0.5',
          'active:scale-[0.98]',
          isCompact ? 'w-full aspect-square' : 'w-32 h-32',
          (isDeleting || isUploading) && 'opacity-60 hover:scale-100 hover:translate-y-0',
          isSearchFile 
            ? 'border-blue-500/50 hover:border-blue-500' 
            : 'border-border/50 hover:border-border',
        )}
        onClick={() => !isUploading && !isDeleting && setShowPreviewModal(true)}
      >
      {/* Main content area */}
      <div className="relative flex-1 min-h-0">
        {isUploading || isDeleting ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : isImage ? (
          <div className="absolute inset-0">
            {imageUrl && (
              <>
                <img
                  src={imageUrl}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent group-hover:from-black/20 transition-all duration-200" />
              </>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <FileIcon
              className={cn(
                'text-primary transition-transform duration-300',
                isCompact ? 'h-6 w-6' : 'h-8 w-8',
                'group-hover:scale-110',
              )}
            />
            <span className="text-[10px] font-medium text-muted-foreground">
              {extension}
            </span>
          </div>
        )}
      </div>

      {/* Bottom label - non-absolute positioning */}
      <div
        className={cn(
          'bg-gradient-to-t from-background/90 to-background/50 backdrop-blur-sm px-1 py-1',
          'transition-all duration-200 border-t border-border/20',
        )}
      >
        <p
          className={cn(
            'truncate text-foreground/80 font-medium text-center',
            'text-[10px] group-hover:text-foreground transition-colors',
          )}
        >
          {isDeleting ? 'Deleting...' : truncatedName}
        </p>
      </div>

      {/* Hover overlay effect - similar to WebSearch cards */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {!isUploading && !isDeleting && (
        <div className="absolute top-0.5 right-0.5 flex gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenFile(e);
            }}
            className={cn(
              'p-0.5 rounded-md bg-background/80 backdrop-blur-sm',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-300',
              'hover:bg-primary hover:text-primary-foreground',
            )}
            title="Open file"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFile(e);
              }}
              disabled={isDeleting}
              className={cn(
                'p-0.5 rounded-md bg-background/80 backdrop-blur-sm',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                'hover:bg-destructive hover:text-destructive-foreground',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              title="Delete file"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      </div>

      {mounted && (
        <FilePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          attachments={allAttachments.length > 0 ? allAttachments : [attachment]}
          initialIndex={allAttachments.length > 0 ? allAttachments.findIndex(a => a.url === attachment.url) : 0}
        />
      )}
    </>
  );
}