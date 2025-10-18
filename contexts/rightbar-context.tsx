'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface RightbarContextValue {
  isOpen: boolean;
  toggleRightbar: () => void;
  setRightbarOpen: (open: boolean) => void;
}

const RightbarContext = createContext<RightbarContextValue | null>(null);

export function RightbarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'j' &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleRightbar = () => setIsOpen((prev) => !prev);
  const setRightbarOpen = (open: boolean) => setIsOpen(open);

  return (
    <RightbarContext.Provider value={{ isOpen, toggleRightbar, setRightbarOpen }}>
      {children}
    </RightbarContext.Provider>
  );
}

export function useRightbar() {
  const context = useContext(RightbarContext);
  if (!context) {
    throw new Error('useRightbar must be used within RightbarProvider');
  }
  return context;
}
