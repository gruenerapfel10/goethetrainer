'use client';

import { useEffect } from 'react';
import { initializeNotificationSystem } from '@/lib/utils/browser-notifications';
import { runNotificationDiagnostics } from '@/lib/utils/notification-diagnostics';

export function NotificationInitializer() {
  useEffect(() => {
    // Initialize notification system when the app loads
    initializeNotificationSystem();
    
    // Make diagnostics available in browser console
    if (typeof window !== 'undefined') {
      (window as any).notificationDiagnostics = runNotificationDiagnostics;
      console.log('💡 Notification diagnostics available: Run notificationDiagnostics() in console');
    }
  }, []);

  return null;
} 