// run this in console dev tools

import { getNotificationDebugInfo, requestNotificationPermission, showNotification } from './browser-notifications';

export async function runNotificationDiagnostics(): Promise<void> {
  
  // 1. Check basic support
  const debugInfo = getNotificationDebugInfo();
  
  // 2. Check common issues
  
  if (!debugInfo.supported) {
    return;
  }
  
  if (!debugInfo.isSecureContext) {
    return;
  }
  
  if (!debugInfo.isServiceWorkerSupported) {
  }
  
  // 3. Check permission status
  
  if (debugInfo.permission === 'denied') {
    return;
  }
  
  if (debugInfo.permission === 'default') {
    const granted = await requestNotificationPermission();
    
    if (!granted) {
      return;
    }
  }
  
  // 4. Test notification with icon
  try {
    const testNotification = showNotification({
      title: 'Test Notification 🧪',
      body: 'Check if the Moterra logo appears as the icon!',
      requireInteraction: false,
    });
    
    if (testNotification) {
      
      // Test if PNG exists
      fetch('/logo_white.png')
        .then(res => {
        })
        .catch(err => {});
    } else {
    }
  } catch (error) {
  }
  
  // 5. OS-specific checks
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('mac')) {
  } else if (ua.includes('windows')) {
  } else if (ua.includes('linux')) {
  }
  
  // 6. Browser-specific checks
  if (ua.includes('chrome')) {
  } else if (ua.includes('firefox')) {
  } else if (ua.includes('safari')) {
  } else if (ua.includes('edg')) {
  }
  
}

// Export to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).runNotificationDiagnostics = runNotificationDiagnostics;
} 