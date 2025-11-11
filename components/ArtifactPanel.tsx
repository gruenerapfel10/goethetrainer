'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useWindowSize } from 'usehooks-ts';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useArtifactsContext } from '@/contexts/artifacts-context';
import { ArtifactHeader } from './artifacts/ArtifactHeader';
import { ArtifactsList } from './artifacts/ArtifactsList';
import { WebArtifact } from './artifacts/WebArtifact';
import { DocumentArtifact } from './artifacts/DocumentArtifact';
import { CodeArtifact } from './artifacts/CodeArtifact';
import { SheetArtifact } from './artifacts/SheetArtifact';
import { PDFArtifact } from './artifacts/PDFArtifact';
import { DocxArtifact } from './artifacts/DocxArtifact';
import { XlsxArtifact } from './artifacts/XlsxArtifact';
import { CsvArtifact } from './artifacts/CsvArtifact';

export function ArtifactPanel() {
  const {
    activeArtifact,
    artifactsState,
    setArtifactsVisible,
    navigateArtifactSource,
    openArtifact,
    editContent,
  } = useArtifactsContext();

  const [panelWidth, setPanelWidth] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(0);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const { width: windowWidth } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;
  
  // Auto-scroll state
  const isLockedRef = useRef(true);
  const lastScrollTop = useRef(0);

  const artifact = activeArtifact;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartWidth(panelWidth);
  }, [panelWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !windowWidth) return;
    const deltaX = e.clientX - dragStartX;
    const deltaWidthPercent = -(deltaX / windowWidth) * 100;
    const newWidth = dragStartWidth + deltaWidthPercent;
    const clampedWidth = Math.max(10, Math.min(80, newWidth));
    setPanelWidth(clampedWidth);
  }, [isDragging, windowWidth, dragStartX, dragStartWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleContentChange = useCallback((content: string) => {
    if (!artifact) return;

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      editContent(artifact.documentId, content, artifact.title).catch(console.error);
    }, 1000);

    setTypingTimeout(timeout);
  }, [typingTimeout, artifact, editContent]);

  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    if (document.body) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (document.body) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Handle scroll to detect user intent
  useEffect(() => {
    const container = contentScrollRef.current;
    if (!container) {
      console.log('⚠️ No scroll container found!');
      return;
    }
    
    console.log('✅ Scroll handler attached to:', container);
    
    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      const maxScrollTop = container.scrollHeight - container.clientHeight;
      const scrollPosition = maxScrollTop > 0 ? currentScrollTop / maxScrollTop : 0;
      const isScrollingUp = currentScrollTop < lastScrollTop.current - 1;
      const isScrollingDown = currentScrollTop > lastScrollTop.current + 1;
      
      console.log('📊 Scroll event:', { currentScrollTop, maxScrollTop, scrollPosition, isScrollingUp, isScrollingDown, locked: isLockedRef.current });
      
      if (isScrollingUp) {
        // ANY upward scroll unlocks, regardless of position
        if (isLockedRef.current) {
          console.log('🔓 Autoscroll UNLOCKED - user scrolled up');
          isLockedRef.current = false;
        }
      } else if (isScrollingDown && scrollPosition >= 0.97) {
        // Downward scroll only relocks if at 97%+ 
        if (!isLockedRef.current) {
          console.log('🔒 Autoscroll RELOCKED - user scrolled down to 97%+');
          isLockedRef.current = true;
        }
      }
      
      lastScrollTop.current = currentScrollTop;
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [contentScrollRef]);
  
  // Scroll on artifact change
  useEffect(() => {
    if (artifact) {
      isLockedRef.current = true;
      // Force scroll to bottom on artifact load
      setTimeout(() => {
        const container = contentScrollRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    }
  }, [artifact?.documentId]);
  
  // Auto-scroll during streaming if locked
  useEffect(() => {
    if (artifact?.status === 'streaming' && isLockedRef.current) {
      const interval = setInterval(() => {
        const container = contentScrollRef.current;
        if (container && isLockedRef.current) {
          console.log('📜 Auto-scrolling...', container.scrollTop, container.scrollHeight);
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [artifact?.status]);

  // Auto-scroll when artifact changes if locked
  useEffect(() => {
    if (isLockedRef.current && artifact) {
      const container = contentScrollRef.current;
      if (container) {
        console.log('📜 Scrolling on artifact change (locked)');
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [artifact]);

  const renderArtifact = () => {
    if (!artifact) {
      return (
        <ArtifactsList 
          artifacts={Object.values(artifactsState.artifacts)}
          onSelectArtifact={(documentId) => openArtifact(documentId).catch(console.error)}
        />
      );
    }

    switch (artifact.kind) {
      case 'text':
        return <DocumentArtifact artifact={artifact} onSaveContent={handleContentChange} />;
      case 'code':
        return <CodeArtifact artifact={artifact} onSaveContent={handleContentChange} />;
      case 'sheet':
        return <SheetArtifact artifact={artifact} onSaveContent={(content) => handleContentChange(content)} />;
      case 'webpage':
        return (
          <WebArtifact
            artifact={artifact}
            onNavigate={(index) => navigateArtifactSource(artifact.documentId, index)}
            onClose={() => setArtifactsVisible(false)}
          />
        );
      case 'pdf':
        return <PDFArtifact artifact={artifact} />;
      case 'docx':
        return <DocxArtifact artifact={artifact} />;
      case 'xlsx':
        return <XlsxArtifact artifact={artifact} />;
      case 'csv':
        return <CsvArtifact artifact={artifact} />;
      default:
        return <ArtifactsList 
          artifacts={Object.values(artifactsState.artifacts)}
          onSelectArtifact={(documentId) => openArtifact(documentId).catch(console.error)}
        />;
    }
  };

  const content = (
    <div className="h-full flex flex-col bg-background">
      {artifact && <ArtifactHeader />}
      <div ref={contentScrollRef} className="flex-1 overflow-y-auto">
        {renderArtifact()}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={artifactsState.isVisible} onOpenChange={(open) => !open && setArtifactsVisible(false)}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <AnimatePresence>
      {artifactsState.isVisible && (
        <motion.div
          ref={containerRef}
          className="h-dvh flex border-l border-border/50 shadow-lg shadow-orange-500/5"
          initial={{ width: 0 }}
          animate={{ width: `${panelWidth}%` }}
          exit={{ width: 0 }}
          transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="relative w-0 h-full">
            <div
              className="absolute left-[-4px] top-0 w-2 h-full cursor-col-resize z-50"
              onMouseDown={handleMouseDown}
            />
            <div
              className={cn(
                "absolute left-[-16px] top-1/2 -translate-y-1/2 z-50 w-4 h-16 flex items-center justify-center cursor-col-resize transition-opacity duration-200",
                isDragging ? "opacity-100" : "opacity-60 hover:opacity-100",
                "group"
              )}
              onMouseDown={handleMouseDown}
            >
              <div
                className={cn(
                  "w-1.5 h-12 rounded-full bg-zinc-400 dark:bg-zinc-600 transition-all duration-200 ease-out",
                  "group-hover:h-16 group-hover:w-2 group-hover:bg-zinc-500 dark:group-hover:bg-zinc-500",
                  isDragging && "h-16 w-2 bg-zinc-500 dark:bg-zinc-500",
                  "shadow-sm"
                )}
              />
            </div>
          </div>

          <div className="flex-1 h-full flex flex-col overflow-hidden relative bg-background">
            {isDragging && <div className="absolute inset-0 z-[100] cursor-col-resize" />}
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
