import { useEffect, useState, useCallback } from 'react';

export function useChatModal() {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const toggleModal = useCallback(() => setIsOpen(prev => !prev), []);

  // Keyboard shortcut handling removed from hook - should be handled by the component that uses this hook
  // This prevents conflicts with other keyboard shortcuts like ChatPanel

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
  };
}