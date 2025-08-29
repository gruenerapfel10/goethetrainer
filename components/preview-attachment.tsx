import type { Attachment } from 'ai';
import { FileIcon, Expand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2, XIcon, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ImagePreviewModal } from './image-preview-modal';

export function PreviewAttachment({
  attachment,
  isUploading = false,
  isCompact = false,
  onDelete,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  isCompact?: boolean;
  onDelete?: (attachment: Attachment) => void;
}) {
  const { name, url, contentType } = attachment;
  const isImage = contentType?.startsWith('image/');
  const extension = name?.split('.').pop()?.toUpperCase() || '';
  const truncatedName =
    name && name.length > 15 ? `${name.slice(0, 12)}...` : name;

  const [isDeleting, setIsDeleting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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
    <div
      className={cn(
        'group relative rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm overflow-hidden',
        'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300',
        isCompact ? 'w-20 h-20' : 'w-24 h-24',
        (isDeleting || isUploading) && 'opacity-60',
      )}
    >
      {isUploading || isDeleting ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      ) : isImage ? (
        <div className="relative w-full h-full">
          {imageUrl && (
            <>
              <img
                src={imageUrl}
                alt={name}
                className={cn(
                  'absolute inset-0 w-full h-full object-cover',
                  isCompact ? 'p-0.5' : 'p-1',
                )}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
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

      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/30 p-1',
          'opacity-100 transition-opacity duration-300',
        )}
      >
        <p
          className={cn(
            'truncate text-foreground font-medium text-center',
            'text-[10px]',
          )}
        >
          {isDeleting ? 'Deleting...' : truncatedName}
        </p>
      </div>

      {!isUploading && !isDeleting && (
        <div className="absolute top-0.5 right-0.5 flex gap-0.5">
          {isImage && imageUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowPreviewModal(true);
              }}
              className={cn(
                'p-0.5 rounded-md bg-background/80 backdrop-blur-sm',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                'hover:bg-primary hover:text-primary-foreground',
              )}
              title="Preview image"
            >
              <Expand className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={handleOpenFile}
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
              onClick={handleDeleteFile}
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

      {isImage && imageUrl && (
        <ImagePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          imageUrl={imageUrl}
          imageName={name}
        />
      )}
    </div>
  );
}
