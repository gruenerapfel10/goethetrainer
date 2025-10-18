'use client';

import { useEffect } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { useRightSidebar } from '@/lib/right-sidebar-context';

export function KeyboardShortcutHandler() {
  const { toggleSidebar } = useSidebar();
  const { toggle } = useRightSidebar();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;

      if (event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      } else if (event.key === 'j') {
        event.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggle]);

  return null;
}
