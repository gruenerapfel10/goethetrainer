'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Download, ExternalLink, FileIcon, Image, FileText, Music, Video, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Attachment } from '@/lib/ai/chat-manager';
import { toast } from 'sonner';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: Attachment[];
  initialIndex?: number;
}

// Platform detection hook
function usePlatform() {
  const [platform, setPlatform] = useState<'mac' | 'windows' | 'other'>('other');

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      setPlatform('mac');
    } else if (userAgent.includes('win')) {
      setPlatform('windows');
    }
  }, []);

  return platform;
}

// File type detection
function getFileType(contentType: string | undefined, name: string | undefined) {
  if (!contentType && !name) return 'unknown';
  
  const type = contentType?.toLowerCase() || '';
  const ext = name?.split('.').pop()?.toLowerCase() || '';
  
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return 'image';
  }
  if (type.startsWith('video/') || ['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
    return 'video';
  }
  if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
    return 'audio';
  }
  if (type.includes('pdf') || ext === 'pdf') {
    return 'pdf';
  }
  if (type.includes('wordprocessingml') || ext === 'docx') {
    return 'docx';
  }
  if (type.includes('text') || ['txt', 'md', 'json', 'xml', 'csv'].includes(ext)) {
    return 'text';
  }
  return 'document';
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'image':
      return Image;
    case 'video':
      return Video;
    case 'audio':
      return Music;
    case 'pdf':
    case 'text':
      return FileText;
    default:
      return FileIcon;
  }
}

export function FilePreviewModal({ isOpen, onClose, attachments, initialIndex = 0 }: FilePreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [imageLoading, setImageLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [pdfError, setPdfError] = useState(false);
  const [docxPresignedUrl, setDocxPresignedUrl] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const platform = usePlatform();

  const attachment = attachments[currentIndex];
  const fileType = getFileType(attachment?.contentType, attachment?.name);
  const FileIconComponent = getFileIcon(fileType);
  const extension = attachment?.name?.split('.').pop()?.toUpperCase() || '';

  // Helper function to render image content
  const renderImageContent = (att: Attachment, imageUrl: string | undefined, loading: boolean) => {
    const type = getFileType(att?.contentType, att?.name);
    const Icon = getFileIcon(type);
    const ext = att?.name?.split('.').pop()?.toUpperCase() || '';

    if (type === 'image') {
      return (
        <>
          {/* Blurred backdrop */}
          {imageUrl && !loading && (
            <div className="absolute inset-0">
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-50 scale-110"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-background/30" />
            </div>
          )}
          
          {loading ? (
            <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Loading image...</p>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={att.name}
              className="relative z-10 max-w-full max-h-full object-contain shadow-2xl rounded-lg m-auto"
              style={{
                transform: currentIndex === attachments.indexOf(att) 
                  ? `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`
                  : 'scale(1)',
                pointerEvents: zoom > 1 && currentIndex === attachments.indexOf(att) ? 'none' : 'auto'
              }}
              draggable={false}
            />
          ) : (
            <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <Image className="h-16 w-16" />
              <p>Failed to load image</p>
            </div>
          )}
        </>
      );
    } else {
      // Non-image file
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="p-8 rounded-3xl bg-primary/5">
            <Icon className="h-24 w-24 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium">{att.name}</h3>
            <p className="text-muted-foreground">
              {type === 'pdf' && 'PDF Document'}
              {type === 'docx' && 'Word Document'}
              {type === 'text' && 'Text File'}
              {type === 'audio' && 'Audio File'}
              {type === 'video' && 'Video File'}
              {type === 'document' && 'Document'}
              {type === 'unknown' && 'File'}
            </p>
          </div>
        </div>
      );
    }
  };

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset current index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Fetch presigned URLs for current and adjacent images
  useEffect(() => {
    if (!isOpen) return;

    // Fetch URLs for current, previous, and next images
    const indicesToFetch = [
      currentIndex - 1,
      currentIndex,
      currentIndex + 1
    ].filter(i => i >= 0 && i < attachments.length);

    indicesToFetch.forEach(index => {
      const att = attachments[index];
      const type = getFileType(att.contentType, att.name);
      
      if (type === 'image' && att.url && !imageUrls[index]) {
        // Set loading state only for current image
        if (index === currentIndex) {
          setImageLoading(true);
        }
        
        fetch('/api/files/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ s3Url: att.url }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.presignedUrl) {
              setImageUrls(prev => ({ ...prev, [index]: data.presignedUrl }));
            }
          })
          .catch((error) => {
            console.error('Error fetching presigned URL for image:', error);
          })
          .finally(() => {
            if (index === currentIndex) {
              setImageLoading(false);
            }
          });
      }
    });

    // Reset zoom when changing images
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setPdfError(false);
    
    // Fetch presigned URL for DOCX files
    if (fileType === 'docx' && attachment?.url) {
      setDocxLoading(true);
      fetch('/api/files/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Url: attachment.url }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.presignedUrl) {
            setDocxPresignedUrl(data.presignedUrl);
          }
        })
        .catch((error) => {
          console.error('Error fetching presigned URL for DOCX:', error);
        })
        .finally(() => {
          setDocxLoading(false);
        });
    } else {
      setDocxPresignedUrl(null);
    }
  }, [currentIndex, attachments, isOpen, fileType, attachment?.url]);

  // Fetch thumbnail URLs for all image attachments
  useEffect(() => {
    if (!isOpen) return;

    attachments.forEach((att) => {
      const type = getFileType(att.contentType, att.name);
      if (type === 'image' && att.url && !thumbnailUrls[att.url]) {
        fetch('/api/files/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ s3Url: att.url }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.presignedUrl) {
              setThumbnailUrls(prev => ({ ...prev, [att.url!]: data.presignedUrl }));
            }
          })
          .catch((error) => {
            console.error('Error fetching thumbnail URL:', error);
          });
      }
    });
  }, [attachments, isOpen]);

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(false);
      const animTimer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return () => {
        clearTimeout(animTimer);
      };
    } else {
      setIsAnimating(false);
      // Reset zoom and position when closing
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setImageUrls({});
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, currentIndex, attachments.length]);

  const handleDownload = useCallback(async () => {
    if (!attachment?.url) return;

    try {
      const response = await fetch('/api/files/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Url: attachment.url }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.presignedUrl) {
          const link = document.createElement('a');
          link.href = data.presignedUrl;
          link.download = attachment.name || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success('Download started');
        }
      } else {
        toast.error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error downloading file');
    }
  }, [attachment]);

  const handleOpenExternal = useCallback(async () => {
    if (!attachment?.url) return;

    try {
      const response = await fetch('/api/files/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Url: attachment.url }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.presignedUrl) {
          window.open(data.presignedUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        toast.error('Failed to open file');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      toast.error('Error opening file');
    }
  }, [attachment]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
    }
  }, []);

  // Drag handlers for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Navigation handlers - SIMPLE AND CLEAN
  const handleNext = useCallback(() => {
    if (currentIndex < attachments.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, attachments.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleThumbnailClick = useCallback((index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
    
    // Scroll to thumbnail
    if (carouselRef.current) {
      const thumbnails = carouselRef.current.querySelectorAll('[data-thumbnail]');
      const target = thumbnails[index] as HTMLElement;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentIndex]);

  // Don't render anything on server side or if not mounted
  if (!mounted || !isOpen || !attachment) return null;

  // Only render portal on client side after mount
  if (typeof window === 'undefined') return null;

  // Create portal to render modal at document root
  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-[999] bg-black/20 dark:bg-black/40 flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        isAnimating ? 'opacity-100 backdrop-blur-md' : 'opacity-0 backdrop-blur-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl transition-all duration-300 ease-out relative ${
          isAnimating ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-background backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="relative">
            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-r from-orange-500/5 via-primary/5 to-orange-500/5" />
            
            <div className="relative flex items-center gap-3 p-4 border-b border-border/50 bg-background/80 backdrop-blur-md">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileIconComponent className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-lg line-clamp-1">
                  {attachment.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {extension} • {fileType}
                  {attachments.length > 1 && ` • ${currentIndex + 1} of ${attachments.length}`}
                </div>
              </div>
              
              <button
                onClick={handleDownload}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4 text-muted-foreground" />
              </button>
              
              <button
                onClick={handleOpenExternal}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </button>
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Content with navigation */}
          <div className="relative p-6">
            {/* Navigation arrows if multiple attachments */}
            {attachments.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className={cn(
                    "absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full",
                    "bg-background/90 backdrop-blur-sm border border-border/50",
                    "hover:bg-accent transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label="Previous attachment"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === attachments.length - 1}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full",
                    "bg-background/90 backdrop-blur-sm border border-border/50",
                    "hover:bg-accent transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label="Next attachment"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {fileType === 'image' ? (
              <div className="relative">
                {/* Zoom controls for images */}
                {imageUrls[currentIndex] && !imageLoading && (
                  <div className="absolute top-2 right-2 z-10 flex gap-1 bg-background/90 backdrop-blur-sm rounded-lg p-1 border border-border/50">
                    <button
                      onClick={handleZoomOut}
                      disabled={zoom <= 0.5}
                      className="p-1.5 rounded hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="p-1.5 rounded hover:bg-accent transition-colors"
                      title="Reset zoom"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleZoomIn}
                      disabled={zoom >= 3}
                      className="p-1.5 rounded hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Zoom in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <div className="px-2 py-1.5 text-xs font-mono text-muted-foreground">
                      {Math.round(zoom * 100)}%
                    </div>
                  </div>
                )}
                
                <div 
                  ref={imageContainerRef}
                  className="relative flex items-center justify-center h-[500px] overflow-hidden rounded-2xl bg-background"
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                >
                  {/* Simple carousel with transform */}
                  <div 
                    className="flex w-full h-full transition-transform duration-300 ease-out"
                    style={{
                      transform: `translateX(-${currentIndex * 100}%)`
                    }}
                  >
                    {attachments.map((att, index) => (
                      <div
                        key={att.url}
                        className="min-w-full h-full flex items-center justify-center"
                      >
                        {renderImageContent(att, imageUrls[index], index === currentIndex && imageLoading)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : fileType === 'pdf' ? (
              <div className="relative h-[500px] overflow-hidden rounded-2xl bg-background">
                {!pdfError && attachment.url ? (
                  <iframe
                    src={`/api/s3/preview?url=${encodeURIComponent(attachment.url)}`}
                    className="w-full h-full border-0"
                    title={attachment.name}
                    onError={() => setPdfError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-6">
                    <div className="p-8 rounded-3xl bg-primary/5">
                      <FileIconComponent className="h-24 w-24 text-primary" />
                    </div>
                    
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-medium">{attachment.name}</h3>
                      <p className="text-muted-foreground">Unable to preview PDF</p>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleOpenExternal}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open File
                      </button>
                      
                      <button
                        onClick={handleDownload}
                        className="px-6 py-3 bg-accent text-accent-foreground rounded-xl hover:bg-accent/80 transition-colors flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : fileType === 'docx' ? (
              <div className="relative h-[500px] overflow-hidden rounded-2xl bg-background">
                {docxLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      <p className="text-sm text-muted-foreground">Loading document...</p>
                    </div>
                  </div>
                ) : docxPresignedUrl ? (
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(docxPresignedUrl)}`}
                    className="w-full h-full border-0"
                    title={attachment.name}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-6">
                    <div className="p-8 rounded-3xl bg-primary/5">
                      <FileIconComponent className="h-24 w-24 text-primary" />
                    </div>
                    
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-medium">{attachment.name}</h3>
                      <p className="text-muted-foreground">Unable to preview document</p>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleOpenExternal}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open File
                      </button>
                      
                      <button
                        onClick={handleDownload}
                        className="px-6 py-3 bg-accent text-accent-foreground rounded-xl hover:bg-accent/80 transition-colors flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] gap-6">
                <div className="p-8 rounded-3xl bg-primary/5">
                  <FileIconComponent className="h-24 w-24 text-primary" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium">
                    {attachment.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {fileType === 'text' && 'Text File'}
                    {fileType === 'audio' && 'Audio File'}
                    {fileType === 'video' && 'Video File'}
                    {fileType === 'document' && 'Document'}
                    {fileType === 'unknown' && 'File'}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleOpenExternal}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open File
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="px-6 py-3 bg-accent text-accent-foreground rounded-xl hover:bg-accent/80 transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Carousel of thumbnails if multiple attachments */}
          {attachments.length > 1 && (
            <div className="px-6 pb-4">
              <div 
                ref={carouselRef}
                className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
              >
                {attachments.map((att, index) => {
                  const thumbType = getFileType(att.contentType, att.name);
                  const ThumbIcon = getFileIcon(thumbType);
                  const isCurrentThumb = index === currentIndex;
                  const thumbExt = att.name?.split('.').pop()?.toUpperCase() || '';
                  
                  return (
                    <button
                      key={att.url}
                      data-thumbnail
                      onClick={() => handleThumbnailClick(index)}
                      className={cn(
                        "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                        isCurrentThumb 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "border-border/50 hover:border-primary/50"
                      )}
                    >
                      {thumbType === 'image' && att.url && thumbnailUrls[att.url] ? (
                        <img
                          src={thumbnailUrls[att.url]}
                          alt={att.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted/20 flex flex-col items-center justify-center gap-0.5">
                          <ThumbIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-[8px] text-muted-foreground">
                            {thumbExt}
                          </span>
                        </div>
                      )}
                      {isCurrentThumb && (
                        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer with shortcuts */}
          <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono">Esc</kbd>
                <span className="ml-1">Close</span>
              </div>
              {attachments.length > 1 && (
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono">←</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono">→</kbd>
                  <span className="ml-1">Navigate</span>
                </div>
              )}
              {fileType === 'image' && (
                <>
                  <div className="flex items-center gap-1">
                    {platform === 'mac' ? (
                      <>
                        <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">⌘</kbd>
                        <span>+</span>
                      </>
                    ) : (
                      <>
                        <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Ctrl</kbd>
                        <span>+</span>
                      </>
                    )}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Scroll</kbd>
                    <span className="ml-1">Zoom</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Drag to pan when zoomed</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground/60">
              <span>File preview</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}