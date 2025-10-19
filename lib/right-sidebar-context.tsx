'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const COOKIE_NAME = 'right_sidebar_state';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const KEYBOARD_SHORTCUT = 'j';

type RightSidebarContextProps = {
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

const RightSidebarContext = createContext<RightSidebarContextProps | undefined>(undefined);

export function RightSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpenState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (saved) {
        return saved[1] === 'true';
      }
    }
    return false; // Default to closed
  });

  const setOpen = useCallback((open: boolean) => {
    setOpenState(open);
    document.cookie = `${COOKIE_NAME}=${open}; path=/; max-age=${COOKIE_MAX_AGE}`;
  }, []);

  const toggle = useCallback(() => {
    setOpenState(prev => {
      const newState = !prev;
      document.cookie = `${COOKIE_NAME}=${newState}; path=/; max-age=${COOKIE_MAX_AGE}`;
      return newState;
    });
  }, []);

  return (
    <RightSidebarContext.Provider value={{ isOpen, toggle, setOpen }}>
      {children}
    </RightSidebarContext.Provider>
  );
}

export function useRightSidebar() {
  const context = useContext(RightSidebarContext);
  if (!context) {
    throw new Error('useRightSidebar must be used within RightSidebarProvider');
  }
  return context;
}
