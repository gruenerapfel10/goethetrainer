'use client';

import { useEffect } from 'react';
import { useNotificationSettings } from '@/hooks/use-notification-settings';

export function NotificationPrompt() {
  const { showInitialPrompt } = useNotificationSettings();

  useEffect(() => {
    // Show the prompt once when the app loads
    showInitialPrompt();
  }, [showInitialPrompt]);

  return null;
}