'use client';

import React, { createContext, useContext, useState } from 'react';

type RightSidebarContextProps = {
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

const RightSidebarContext = createContext<RightSidebarContextProps | undefined>(undefined);

export function RightSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(true);

  const toggle = () => setOpen(prev => !prev);

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
