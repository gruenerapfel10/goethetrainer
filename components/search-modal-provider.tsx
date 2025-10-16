'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SearchModal } from './search-modal';

interface SearchModalContextType {
  openSearchModal: () => void;
  closeSearchModal: () => void;
  isSearchModalOpen: boolean;
}

const SearchModalContext = createContext<SearchModalContextType | null>(null);

export function useSearchModal() {
  const context = useContext(SearchModalContext);
  if (!context) {
    throw new Error('useSearchModal must be used within SearchModalProvider');
  }
  return context;
}

export function SearchModalProvider({ children }: { children: React.ReactNode }) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Keyboard shortcut to open search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openSearchModal = () => setIsSearchModalOpen(true);
  const closeSearchModal = () => setIsSearchModalOpen(false);

  return (
    <SearchModalContext.Provider value={{ openSearchModal, closeSearchModal, isSearchModalOpen }}>
      {children}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={closeSearchModal}
      />
    </SearchModalContext.Provider>
  );
}