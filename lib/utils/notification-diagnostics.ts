// run this in console dev tools

import { getNotificationDebugInfo, requestNotificationPermission, showNotification } from './browser-notifications';

export async function runNotificationDiagnostics(): Promise<void> {
  console.log('=== NOTIFICATION SYSTEM DIAGNOSTICS ===');
  
  // 1. Check basic support
  const debugInfo = getNotificationDebugInfo();
  console.log('1. Debug Info:', debugInfo);
  
  // 2. Check common issues
  console.log('\n2. Common Issues Check:');
  
  if (!debugInfo.supported) {
    console.error('❌ Browser does not support Notification API');
    console.log('   Solution: Use a modern browser (Chrome, Firefox, Safari, Edge)');
    return;
  }
  
  if (!debugInfo.isSecureContext) {
    console.error('❌ Not running in secure context (HTTPS required)');
    console.log('   Solution: Use HTTPS or localhost for development');
    console.log('   Current origin:', window.location.origin);
    return;
  }
  
  if (!debugInfo.isServiceWorkerSupported) {
    console.warn('⚠️  Service Worker not supported (optional but recommended)');
  }
  
  // 3. Check permission status
  console.log('\n3. Permission Status:', debugInfo.permission);
  
  if (debugInfo.permission === 'denied') {
    console.error('❌ Notifications are blocked');
    console.log('   Solution: To unblock notifications:');
    console.log('   - Chrome/Edge: Click the lock icon in address bar → Site settings → Notifications → Allow');
    console.log('   - Firefox: Click the lock icon → Clear permissions and reload');
    console.log('   - Safari: Safari menu → Settings → Websites → Notifications → Allow');
    return;
  }
  
  if (debugInfo.permission === 'default') {
    console.warn('⚠️  Permission not yet requested');
    console.log('   Requesting permission now...');
    const granted = await requestNotificationPermission();
    console.log('   Permission granted:', granted);
    
    if (!granted) {
      console.error('❌ Permission denied by user');
      return;
    }
  }
  
  // 4. Test notification with icon
  console.log('\n4. Testing notification with icon...');
  try {
    const testNotification = showNotification({
      title: 'Test Notification 🧪',
      body: 'Check if the Moterra logo appears as the icon!',
      requireInteraction: false,
    });
    
    if (testNotification) {
      console.log('✅ Notification created successfully!');
      console.log('   You should see a notification with your logo');
      console.log('   Icon URL:', `${window.location.origin}/logo_white.png`);
      
      // Test if PNG exists
      fetch('/logo_white.png')
        .then(res => {
          if (res.ok) {
            console.log('✅ Icon file exists and is accessible');
          } else {
            console.error('❌ Icon file not found or inaccessible');
          }
        })
        .catch(err => console.error('❌ Error checking icon file:', err));
    } else {
      console.error('❌ Failed to create notification');
    }
  } catch (error) {
    console.error('❌ Error creating notification:', error);
  }
  
  // 5. OS-specific checks
  console.log('\n5. OS-Specific Checks:');
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('mac')) {
    console.log('📱 macOS detected');
    console.log('   - Check System Preferences → Notifications → Your Browser');
    console.log('   - Ensure "Allow Notifications" is enabled');
    console.log('   - Check Focus/Do Not Disturb mode is not blocking notifications');
  } else if (ua.includes('windows')) {
    console.log('🪟 Windows detected');
    console.log('   - Check Windows Settings → System → Notifications & actions');
    console.log('   - Ensure browser notifications are allowed');
    console.log('   - Check Focus Assist is not blocking notifications');
  } else if (ua.includes('linux')) {
    console.log('🐧 Linux detected');
    console.log('   - Check your desktop environment notification settings');
  }
  
  // 6. Browser-specific checks
  console.log('\n6. Browser-Specific Notes:');
  if (ua.includes('chrome')) {
    console.log('🌐 Chrome detected');
    console.log('   - chrome://settings/content/notifications');
  } else if (ua.includes('firefox')) {
    console.log('🦊 Firefox detected');
    console.log('   - about:preferences#privacy → Notifications');
  } else if (ua.includes('safari')) {
    console.log('🧭 Safari detected');
    console.log('   - Safari → Settings → Websites → Notifications');
  } else if (ua.includes('edg')) {
    console.log('🌊 Edge detected');
    console.log('   - edge://settings/content/notifications');
  }
  
  console.log('\n=== END DIAGNOSTICS ===');
}

// Export to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).runNotificationDiagnostics = runNotificationDiagnostics;
} 