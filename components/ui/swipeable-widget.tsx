'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';

interface SwipeableView {
  id: string;
  content: React.ReactNode;
  hasData?: boolean; // Optional flag to indicate if view has meaningful data
}

interface SwipeableWidgetProps {
  views: SwipeableView[];
  className?: string;
  title?: React.ReactNode;
}

export function SwipeableWidget({ views, className = '', title }: SwipeableWidgetProps) {
  // Filter out views that don't have data
  const validViews = views.filter(view => {
    // If hasData is explicitly set, use that
    if (view.hasData !== undefined) {
      return view.hasData;
    }
    // Otherwise, check if content exists and is not empty
    return view.content !== null && view.content !== undefined;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const totalWidth = containerWidth * validViews.length;
      setDragConstraints({
        left: -(totalWidth - containerWidth),
        right: 0,
      });
    }
    // Reset current index if it's out of bounds
    if (currentIndex >= validViews.length && validViews.length > 0) {
      setCurrentIndex(0);
    }
  }, [validViews.length, currentIndex]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50; // minimum drag distance to trigger swipe
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (Math.abs(velocity) > 500 || Math.abs(offset) > threshold) {
      if (offset > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        setCurrentIndex(currentIndex - 1);
      } else if (offset < 0 && currentIndex < validViews.length - 1) {
        // Swipe left - go to next
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // If no valid views, show a fallback
  if (validViews.length === 0) {
    return (
      <div className={`relative h-full flex flex-col ${className}`}>
        {title && (
          <div className="mb-4">
            {title}
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white/70 dark:text-white/70 light:text-black/70 text-center">No data available</div>
        </div>
      </div>
    );
  }

  // If only one view, don't show dots or swipe functionality
  if (validViews.length === 1) {
    return (
      <div className={`relative h-full flex flex-col ${className}`}>
        {title && (
          <div className="mb-4">
            {title}
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          {validViews[0].content}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full flex flex-col ${className}`}>
      {/* Title */}
      {title && (
        <div className="mb-4">
          {title}
        </div>
      )}

      {/* Swipeable Content */}
      <div className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing" ref={containerRef}>
        <motion.div
          className="flex h-full"
          animate={{ x: -currentIndex * (containerRef.current?.offsetWidth || 0) }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          drag="x"
          dragConstraints={dragConstraints}
          onDragEnd={handleDragEnd}
          dragElastic={0.1}
        >
          {validViews.map((view, index) => (
            <div
              key={view.id}
              className="w-full h-full flex-shrink-0 flex items-center justify-center"
              style={{ minWidth: '100%' }}
            >
              {view.content}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dots Navigation - Only show if more than 1 valid view */}
      {validViews.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {validViews.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 cursor-pointer hover:scale-125 ${
                index === currentIndex
                  ? 'bg-white shadow-lg'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}