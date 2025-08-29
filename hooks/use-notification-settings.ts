'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const STORAGE_KEY = 'moterra-notification-settings';

export function useNotificationSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    // Initialize from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.enabled && 'Notification' in window && Notification.permission === 'granted';
        }
      } catch (error) {
        console.error('Failed to parse notification settings:', error);
      }
    }
    return false;
  });

  const [hasAskedPermission, setHasAskedPermission] = useState<boolean>(() => {
    // Initialize from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return Boolean(parsed.hasAskedPermission);
        }
      } catch (error) {
        console.error('Failed to parse notification settings:', error);
      }
    }
    return false;
  });
  
  // Add session storage check to prevent multiple prompts
  const [hasShownPromptThisSession, setHasShownPromptThisSession] = useState(false);

  // Load settings and check actual permission state
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // If user has made any decision (enabled or clicked "Not now"), set hasAskedPermission
        if (parsed.hasAskedPermission) {
          setHasAskedPermission(true);
        }
        
        // Only enable if we have actual permission
        if (parsed.enabled && 'Notification' in window && Notification.permission === 'granted') {
          setNotificationsEnabled(true);
        }
      } catch (error) {
        console.error('Failed to parse notification settings:', error);
      }
    }

    // Check session storage for prompt shown flag
    const hasShownPrompt = sessionStorage.getItem('notification-prompt-shown');
    if (hasShownPrompt) {
      setHasShownPromptThisSession(true);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((enabled: boolean, hasAsked: boolean) => {
    const settings = { enabled, hasAskedPermission: hasAsked };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setNotificationsEnabled(enabled);
    setHasAskedPermission(hasAsked);
  }, []);

  const enableNotifications = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Your browser does not support notifications');
      saveSettings(false, true);
      return false;
    }

    const permission = Notification.permission;

    if (permission === 'granted') {
      saveSettings(true, true);
      toast.success('Notifications enabled');
      return true;
    } else if (permission === 'denied') {
      toast.error('Notifications are blocked. To enable them:\n1. Click the lock icon in your address bar\n2. Find "Notifications"\n3. Change it to "Allow"');
      saveSettings(false, true);
      return false;
    } else {
      // Ask for permission
      try {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          saveSettings(true, true);
          toast.success('Notifications enabled! You\'ll be notified when long-running tasks complete.');
          return true;
        } else {
          saveSettings(false, true);
          toast.info('You can enable notifications later from the bell icon in the header');
          return false;
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        saveSettings(false, true);
        return false;
      }
    }
  }, [saveSettings]);

  const disableNotifications = useCallback(() => {
    saveSettings(false, true);
    toast.info('Notifications disabled');
  }, [saveSettings]);

  const toggleNotifications = useCallback(async () => {
    if (notificationsEnabled) {
      disableNotifications();
    } else {
      await enableNotifications();
    }
  }, [notificationsEnabled, enableNotifications, disableNotifications]);

  // Show initial prompt
  const showInitialPrompt = useCallback(() => {
    // Only show prompt if user hasn't made a decision yet AND we haven't shown it this session
    if (!hasAskedPermission && !hasShownPromptThisSession && 'Notification' in window && Notification.permission === 'default') {
      // Mark that we've shown the prompt this session
      sessionStorage.setItem('notification-prompt-shown', 'true');
      setHasShownPromptThisSession(true);
      
      setTimeout(() => {
        toast('Enable browser notifications?', {
          description: 'Get notified when long-running analyses complete, even when you\'re on another tab.',
          duration: 10000,
          action: {
            label: 'Enable',
            onClick: () => {
              enableNotifications();
            },
          },
          cancel: {
            label: 'Not now',
            onClick: () => {
              saveSettings(false, true);
            },
          },
        });
      }, 2000);
    }
  }, [hasAskedPermission, hasShownPromptThisSession, enableNotifications, saveSettings]);

  return {
    notificationsEnabled,
    hasAskedPermission,
    enableNotifications,
    disableNotifications,
    toggleNotifications,
    showInitialPrompt,
  };
} 