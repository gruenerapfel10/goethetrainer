import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HorizontalCarouselProps<T> = {
  items: T[];
  renderItem: (item: T, index: number, state: { isActive: boolean }) => ReactNode;
  renderControls?: (state: { activeIndex: number; onPrev: () => void; onNext: () => void }) => ReactNode;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  bleed?: number;
  gap?: number;
  className?: string;
  getItemId?: (item: T, index: number) => string | number;
};

const clampIndex = (value: number, total: number) => {
  if (total <= 0) return 0;
  return Math.min(Math.max(value, 0), total - 1);
};

export function HorizontalCarousel<T>({
  items,
  renderItem,
  renderControls,
  initialIndex = 0,
  onIndexChange,
  bleed = 56,
  gap = 16,
  className,
  getItemId,
}: HorizontalCarouselProps<T>) {
  const totalItems = items.length;
  const slides = useMemo(() => {
    if (totalItems <= 1) return items;
    return [items[totalItems - 1], ...items, items[0]];
  }, [items, totalItems]);

  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(() => clampIndex(initialIndex, totalItems));
  const [trackIndex, setTrackIndex] = useState(() =>
    totalItems > 1 ? clampIndex(initialIndex, totalItems) + 1 : clampIndex(initialIndex, totalItems)
  );
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const safeIndex = clampIndex(initialIndex, totalItems);
    setActiveIndex(safeIndex);
    setTrackIndex(totalItems > 1 ? safeIndex + 1 : safeIndex);
    setIsAnimating(false);
  }, [initialIndex, totalItems]);

  useEffect(() => {
    const normalized = (() => {
      if (totalItems <= 1) return 0;
      if (trackIndex === 0) return totalItems - 1;
      if (trackIndex === totalItems + 1) return 0;
      return trackIndex - 1;
    })();

    setActiveIndex(normalized);
    onIndexChange?.(normalized);
  }, [onIndexChange, totalItems, trackIndex]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || totalItems <= 1) return;

    const handleTransitionEnd = () => {
      if (trackIndex === 0 || trackIndex === totalItems + 1) {
        const resetIndex = trackIndex === 0 ? totalItems : 1;
        track.style.transition = 'none';
        setTrackIndex(resetIndex);
        requestAnimationFrame(() => {
          track.style.transition = '';
        });
      }
      setIsAnimating(false);
    };

    track.addEventListener('transitionend', handleTransitionEnd);
    return () => track.removeEventListener('transitionend', handleTransitionEnd);
  }, [totalItems, trackIndex]);

  const slideWidth = `calc(100% - ${bleed * 2}px)`;
  const trackStyle: CSSProperties = {
    '--slide-width': slideWidth,
    '--slide-gap': `${gap}px`,
    transform:
      totalItems > 0
        ? `translateX(calc((${-trackIndex}) * (var(--slide-width) + var(--slide-gap)) + ((100% - var(--slide-width)) / 2)))`
        : undefined,
    transition:
      isAnimating && totalItems > 1 ? 'transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none',
  } as CSSProperties;

  const handleMove = (delta: number) => {
    if (totalItems <= 1) return;
    if (isAnimating) return;
    setIsAnimating(true);
    setTrackIndex(current => current + delta);
  };

  if (!totalItems) return null;

  return (
    <div className={cn('relative', className)}>
      <div className="relative overflow-hidden">
        {/* Left vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-16 z-20 bg-gradient-to-r from-background to-transparent"
        />
        {/* Right vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-16 z-20 bg-gradient-to-l from-background to-transparent"
        />

        <div
          ref={trackRef}
          className="flex items-stretch gap-[var(--slide-gap)]"
          style={trackStyle}
        >
          {slides.map((item, slideIdx) => {
            const isCloneEdge = totalItems > 1 && (slideIdx === 0 || slideIdx === slides.length - 1);
            const logicalIndex =
              totalItems <= 1
                ? 0
                : slideIdx === 0
                  ? totalItems - 1
                  : slideIdx === slides.length - 1
                    ? 0
                    : slideIdx - 1;
            const isActive = activeIndex === logicalIndex;
            const key = isCloneEdge
              ? `clone-${logicalIndex}-${slideIdx}`
              : getItemId?.(item, logicalIndex) ?? logicalIndex;

            return (
              <div
                key={key}
                aria-hidden={isCloneEdge}
                className="shrink-0"
                style={{ width: 'var(--slide-width)' }}
              >
                <div
                  className={cn(
                    'h-full transition-transform duration-300 ease-out',
                    isActive ? 'scale-100' : 'scale-[0.97]'
                  )}
                >
                  {renderItem(item, logicalIndex, { isActive })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {renderControls && (
        <div className="mt-4">
          {renderControls({
            activeIndex,
            onPrev: () => handleMove(-1),
            onNext: () => handleMove(1),
          })}
        </div>
      )}
    </div>
  );
}
