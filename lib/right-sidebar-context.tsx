'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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
  const [isOpen, setOpenState] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const saved = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (saved) {
      setOpenState(saved[1] === 'true');
    }
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setOpenState(open);
    if (typeof document !== 'undefined') {
      document.cookie = `${COOKIE_NAME}=${open}; path=/; max-age=${COOKIE_MAX_AGE}`;
    }
  }, []);

  const toggle = useCallback(() => {
    setOpenState(prev => {
      const newState = !prev;
      if (typeof document !== 'undefined') {
        document.cookie = `${COOKIE_NAME}=${newState}; path=/; max-age=${COOKIE_MAX_AGE}`;
      }
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
