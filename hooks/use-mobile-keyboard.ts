'use client';

import { useEffect, useRef, useCallback } from 'react';

const STICKY_INPUT_BUGGED_CLASS_NAME = 'sticky-input-bugged';

interface OverlayCounter {
  isOverlayActive: boolean;
}

export function useMobileKeyboard() {
  const overlayCounterRef = useRef<OverlayCounter>({ isOverlayActive: false });
  const lastVHRef = useRef<number>(0);
  const setViewportVHRef = useRef<boolean>(false);

  // Device detection
  const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;
  const isSafari = typeof window !== 'undefined' && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof window !== 'undefined' && /Android/.test(navigator.userAgent);
  const isStickyInputBugged = isTouch && isSafari && isIOS;

  const setVH = useCallback(() => {
    const w = window.visualViewport || window;
    let vh = (setViewportVHRef.current && !overlayCounterRef.current.isOverlayActive
      ? (w as VisualViewport).height || (w as Window).innerHeight
      : window.innerHeight) * 0.01;
    
    vh = +vh.toFixed(2);
    
    if (lastVHRef.current === vh) {
      return;
    } else if (isTouch && lastVHRef.current < vh && vh - lastVHRef.current > 1) {
      // Fix blurring inputs when keyboard is being closed
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).blur();
      }
    }
    
    lastVHRef.current = vh;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }, [isTouch]);

  const toggleResizeMode = useCallback(() => {
    if (!isStickyInputBugged) return;

    setViewportVHRef.current = isStickyInputBugged && !overlayCounterRef.current.isOverlayActive;
    setVH();
    
    const w = window.visualViewport || window;
    if (w !== window) {
      if (setViewportVHRef.current) {
        window.removeEventListener('resize', setVH);
        w.addEventListener('resize', setVH);
      } else {
        w.removeEventListener('resize', setVH);
        window.addEventListener('resize', setVH);
      }
    }
  }, [isStickyInputBugged, setVH]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    const scrollable = (touch.target as Element)?.closest('.scrollable-y');
    if (scrollable) {
      // Allow scrolling for designated scrollable areas
      return;
    }
    
    e.preventDefault();
  }, []);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length > 1) return;
  }, []);

  const fixSafariStickyInput = useCallback((element: HTMLElement) => {
    if (!isStickyInputBugged) return;
    
    // Scroll to input and adjust viewport
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  }, [isStickyInputBugged]);

  const onFocusIn = useCallback((e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains(STICKY_INPUT_BUGGED_CLASS_NAME)) {
      return;
    }
    
    fixSafariStickyInput(target);
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    document.addEventListener('touchstart', onTouchStart);
  }, [fixSafariStickyInput, onTouchMove, onTouchStart]);

  const onFocusOut = useCallback(() => {
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchstart', onTouchStart);
  }, [onTouchMove, onTouchStart]);

  const onVisibilityChange = useCallback(() => {
    if (document.activeElement?.classList.contains(STICKY_INPUT_BUGGED_CLASS_NAME) &&
        (document.activeElement as HTMLElement).blur) {
      fixSafariStickyInput(document.activeElement as HTMLElement);
    }
  }, [fixSafariStickyInput]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Add Safari class only for iOS Safari
    if (isStickyInputBugged) {
      document.documentElement.classList.add('is-safari');
    }

    // Add Android class for Android devices
    if (isAndroid) {
      document.documentElement.classList.add('is-android');
    }

    // Initial setup
    setVH();
    window.addEventListener('resize', setVH);

    if (isStickyInputBugged) {
      toggleResizeMode();
      
      // Focus/blur handlers for sticky input bug
      document.addEventListener('focusin', onFocusIn);
      document.addEventListener('focusout', onFocusOut);
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      window.removeEventListener('resize', setVH);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setVH);
      }
      
      if (isStickyInputBugged) {
        document.documentElement.classList.remove('is-safari');
        document.removeEventListener('focusin', onFocusIn);
        document.removeEventListener('focusout', onFocusOut);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchstart', onTouchStart);
      }

      if (isAndroid) {
        document.documentElement.classList.remove('is-android');
      }
    };
  }, [isStickyInputBugged, isAndroid, setVH, toggleResizeMode, onFocusIn, onFocusOut, onVisibilityChange, onTouchMove, onTouchStart]);

  return {
    isMobile: isTouch,
    isSafari,
    isIOS,
    isAndroid,
    isStickyInputBugged,
    stickyInputClass: STICKY_INPUT_BUGGED_CLASS_NAME,
  };
}