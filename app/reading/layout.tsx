'use client'

import { useState, useEffect } from 'react';
import { SearchModal } from '@/components/search-modal';
import { AppSidebar } from '@/components/app-sidebar';

export default function ReadingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  
  const handleOpenSearchModal = () => {
    setIsSearchModalOpen(true)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchModalOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setSidebarOpen(!sidebarOpen)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen, setSidebarOpen])

  return (
    <>
      <AppSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onOpenSearchModal={handleOpenSearchModal}
      >
        {children}
      </AppSidebar>

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        chats={[]}
      />
    </>
  );
}