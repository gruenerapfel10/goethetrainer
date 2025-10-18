/**
 * Browser notification utilities for long-running processes
 * 
 * This module handles native OS notifications triggered from the browser.
 * Requirements:
 * - HTTPS connection (or localhost) 
 * - User permission granted
 * - Browser notification API support
 * - OS-level notifications enabled
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  data?: any;
}

/**
 * Debug information for notification issues
 */
export function getNotificationDebugInfo(): {
  supported: boolean;
  permission: NotificationPermission | 'not-supported';
  isSecureContext: boolean;
  isServiceWorkerSupported: boolean;
  userAgent: string;
} {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      permission: 'not-supported',
      isSecureContext: false,
      isServiceWorkerSupported: false,
      userAgent: 'SSR',
    };
  }

  return {
    supported: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'not-supported',
    isSecureContext: window.isSecureContext,
    isServiceWorkerSupported: 'serviceWorker' in navigator,
    userAgent: navigator.userAgent,
  };
}

/**
 * Check if browser notifications are supported and permission is granted
 */
export function canShowNotifications(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check basic requirements
  if (!('Notification' in window)) {
    return false;
  }
  
  // Check secure context (HTTPS or localhost)
  if (!window.isSecureContext) {
    return false;
  }
  
  return Notification.permission === 'granted';
}

/**
 * Request permission to show browser notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  const debugInfo = getNotificationDebugInfo();
  
  if (!debugInfo.supported) {
    return false;
  }
  
  if (!debugInfo.isSecureContext) {
    return false;
  }

  try {
    // Handle both promise-based and callback-based API
    const permission = await new Promise<NotificationPermission>((resolve) => {
      const currentPermission = Notification.permission;
      if (currentPermission !== 'default') {
        resolve(currentPermission);
        return;
      }
      
      // Request permission with fallback for older browsers
      if ('requestPermission' in Notification) {
        const permissionPromise = Notification.requestPermission();
        
        // Handle both promise and callback styles
        if (permissionPromise?.then) {
          permissionPromise.then(resolve);
        } else {
          // Old style with callback
          (Notification as any).requestPermission(resolve);
        }
      } else {
        resolve('denied');
      }
    });
    
    return permission === 'granted';
  } catch (error) {
    return false;
  }
}

/**
 * Show a browser notification with enhanced error handling
 */
export function showNotification(options: NotificationOptions): Notification | null {
  if (!canShowNotifications()) {
    return null;
  }

  try {
    // Use PNG icons for better browser compatibility
    // SVG icons are not supported in most browser notifications
    const defaultIcon = '/logo_white.png'; // Using existing PNG logo
    const iconUrl = options.icon || defaultIcon;
    const absoluteIconUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${iconUrl.startsWith('/') ? iconUrl : `/${iconUrl}`}`
      : iconUrl;

    // Create notification with enhanced options
    const notificationOptions: any = {
      body: options.body,
      icon: absoluteIconUrl,
      tag: options.tag,
      requireInteraction: options.requireInteraction ?? false,
      silent: options.silent ?? false,
      timestamp: Date.now(),
      data: options.data,
    };
    
    // Add vibration pattern for mobile devices
    if (options.vibrate && 'vibrate' in navigator) {
      notificationOptions.vibrate = options.vibrate;
    }
    
    // Add badge for mobile/PWA (smaller icon)
    // Badge should be monochrome and typically 96x96 or smaller
    notificationOptions.badge = absoluteIconUrl;
    
    const notification = new Notification(options.title, notificationOptions);
    

    // Auto-close notification after 10 seconds unless requireInteraction is true
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 10000);
    }

    // Handle notification click - bring the window to focus
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      
      // If data contains a URL, navigate to it
      if (options.data?.url) {
        window.location.href = options.data.url;
      }
    };
    
    // Handle notification error
    notification.onerror = (event) => {};

    return notification;
  } catch (error) {
    return null;
  }
}

/**
 * Show a notification for completed agent processing with enhanced features
 */
export function showAgentCompletionNotification(agentType: string): void {
  const agentNames: Record<string, string> = {
    'deep-research-agent': 'Deep Research',
    'general-bedrock-agent': 'Standard Assistant',
    'sharepoint-agent': 'SharePoint Assistant',
  };

  const agentName = agentNames[agentType] || agentType;
  
  // Only show notification if page is not visible
  if (isPageVisible()) {
    return;
  }

  const notification = showNotification({
    title: `${agentName} Complete ✅`,
    body: `Your ${agentName.toLowerCase()} analysis has finished. Click to view the results.`,
    tag: `agent-complete-${agentType}`,
    requireInteraction: false,
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    data: {
      agentType,
      timestamp: Date.now(),
    },
  });
  
  if (!notification) {
    // Fallback to in-app toast if notifications fail
    // You might want to import and use your toast here as a fallback
  }
}

/**
 * Check if the page is visible (not in background/minimized)
 */
export function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

/**
 * Setup visibility change listener for showing notifications only when page is hidden
 */
export function setupVisibilityListener(
  onVisible: () => void,
  onHidden: () => void
): () => void {
  if (typeof document === 'undefined') return () => {};

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      onVisible();
    } else {
      onHidden();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Initialize notification system with service worker support (optional but recommended)
 */
export async function initializeNotificationSystem(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const debugInfo = getNotificationDebugInfo();
  
  // Check if we're in a supported environment
  if (!debugInfo.supported || !debugInfo.isSecureContext) {
    return;
  }
  
  // Optionally register service worker for better notification support
  if (debugInfo.isServiceWorkerSupported && window.location.hostname !== 'localhost') {
    try {
      // You would need to create a service worker file for this
      // const registration = await navigator.serviceWorker.register('/sw.js');
    } catch (error) {
    }
  }
} 