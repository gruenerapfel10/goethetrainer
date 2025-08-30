'use client'

import { SidebarChat } from '@/components/sidebar-chat';

interface AppRightSidebarProps {
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
}

export function AppRightSidebar({ rightSidebarOpen, setRightSidebarOpen }: AppRightSidebarProps) {
  return (
    <SidebarChat 
      isOpen={rightSidebarOpen} 
      onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
    />
  );
}