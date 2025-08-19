'use client'

import { SidebarChat } from '@/components/sidebar-chat';
import { RightSidebarToggle } from '@/components/right-sidebar-toggle';

interface AppRightSidebarProps {
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
}

export function AppRightSidebar({ rightSidebarOpen, setRightSidebarOpen }: AppRightSidebarProps) {
  return (
    <div
      className={`${rightSidebarOpen ? "w-[400px]" : "w-16"} bg-background flex flex-col transition-all duration-300 relative hidden lg:flex h-full`}
    >
      {rightSidebarOpen ? (
        // Show chat when sidebar is open
        <>
          <div className="flex-1 flex flex-col min-h-0">
            <SidebarChat />
          </div>
          {/* Toggle button when sidebar is open - positioned in top right */}
          <div className="absolute top-4 right-4 z-50">
            <RightSidebarToggle 
              isOpen={rightSidebarOpen} 
              onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
              showText={false}
            />
          </div>
        </>
      ) : (
        // Show toggle button when sidebar is closed
        <div className="flex flex-col h-full items-center pt-4">
          <RightSidebarToggle 
            isOpen={rightSidebarOpen} 
            onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
            showText={false}
          />
        </div>
      )}
    </div>
  );
}