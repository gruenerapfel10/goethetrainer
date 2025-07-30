# Native OS Notification System

## Overview

Our application uses the browser's Notification API to trigger native OS notifications (Windows popups, macOS notifications, etc.) that appear outside the browser window. These notifications work across all major browsers and operating systems.

## Features

- **Native OS Notifications**: Real system notifications that appear in Windows Action Center, macOS Notification Center, etc.
- **Cross-Browser Support**: Works in Chrome, Firefox, Safari, Edge
- **Cross-Platform**: Windows, macOS, Linux support
- **Smart Visibility Detection**: Only shows notifications when the browser tab is in the background
- **Permission Management**: Built-in UI for requesting and managing notification permissions
- **Diagnostic Tools**: Built-in troubleshooting utilities

## How It Works

1. **Permission Request**: Users are prompted to allow notifications on first visit
2. **Background Detection**: Notifications only appear when the tab is not visible
3. **Agent Completion**: When long-running agents (Deep Research, Web Search, etc.) complete, a notification is shown
4. **Click to Focus**: Clicking the notification brings the browser tab back into focus

## Requirements

### Browser Requirements
- **HTTPS Required**: Notifications only work on secure connections (HTTPS) or localhost
- **Modern Browser**: Chrome 22+, Firefox 22+, Safari 6+, Edge 14+

### OS Requirements
- **Windows**: Windows 7+ with notifications enabled
- **macOS**: macOS 10.8+ with browser allowed in System Preferences
- **Linux**: Desktop environment with notification daemon (most modern distros)

## Notification Icon Requirements

### Why SVG Icons Don't Work

Browser notifications require **PNG or JPG images** for security reasons. SVG files are not supported by most browsers for notifications, which is why you might see the Chrome logo instead of your custom icon.

### Icon Specifications

- **Format**: PNG or JPG (PNG recommended for transparency)
- **Size**: 192x192 pixels (minimum recommended)
- **Alternative sizes**: 
  - 512x512 pixels for high-DPI displays
  - 96x96 pixels for badge/small icon
- **File location**: Must be served over HTTPS (or localhost)

### Converting Your Logo

1. **Using ImageMagick** (command line):
   ```bash
   convert public/moterra-logo.svg -resize 192x192 -background transparent public/moterra-icon-192.png
   ```

2. **Using online tools**:
   - [CloudConvert](https://cloudconvert.com/svg-to-png)
   - [SVG to PNG](https://svgtopng.com/)
   - Set output size to 192x192 pixels

3. **Using design software**:
   - Figma: Export as PNG at 192x192
   - Adobe Illustrator: Export for Screens → PNG
   - Inkscape: File → Export PNG Image

## Common Issues & Solutions

### 1. No Notifications Appearing

**Diagnosis**: Run `notificationDiagnostics()` in browser console

**Common Causes**:
- Not using HTTPS (check if URL starts with https:// or is localhost)
- Browser permissions denied
- OS-level notifications disabled
- Browser/tab is in foreground (notifications only show when tab is hidden)

### 2. Permission Denied

**Browser-Specific Solutions**:

**Chrome/Edge**:
1. Click the lock icon in address bar
2. Find "Notifications" 
3. Change from "Block" to "Allow"
4. Reload the page

**Firefox**:
1. Click the lock icon in address bar
2. Click "Clear permissions and reload"
3. Allow notifications when prompted again

**Safari**:
1. Safari menu → Settings → Websites → Notifications
2. Find your site and change to "Allow"

### 3. OS-Level Blocks

**Windows**:
1. Settings → System → Notifications & actions
2. Ensure notifications are on
3. Check Focus Assist is not blocking
4. Ensure your browser is allowed to send notifications

**macOS**:
1. System Preferences → Notifications & Focus
2. Find your browser in the list
3. Ensure "Allow Notifications" is checked
4. Check Do Not Disturb is off

**Linux**:
- Check your desktop environment's notification settings
- Ensure notification daemon is running (e.g., `dunst`, `notify-osd`)

### 4. HTTPS Requirement

Notifications require a secure context:
- ✅ `https://` URLs
- ✅ `localhost` (for development)
- ❌ `http://` URLs (except localhost)
- ❌ File URLs (`file://`)

## Testing Notifications

### Manual Test
1. Open browser console (F12)
2. Run: `notificationDiagnostics()`
3. Follow the diagnostic output

### Quick Test
1. Click the bell icon in the header to enable notifications
2. Switch to another tab or minimize the browser
3. Start a long-running agent (Deep Research, Web Search)
4. Wait for completion - you should see a native OS notification

## Implementation Details

### Supported Agents
Notifications are triggered for these long-running agents:
- Deep Research Agent
- Web Search (Crawler) Agent
- SharePoint Assistant
- SharePoint Search
- Image Analysis Agent

### Not Supported For
These quick agents don't trigger notifications:
- General Agent
- CSV Agent
- Bedrock Agent

## Troubleshooting Commands

Run these in the browser console:

```javascript
// Full diagnostics
notificationDiagnostics()

// Check current permission
Notification.permission

// Test notification immediately
new Notification('Test', { body: 'Testing notifications' })

// Check if running in secure context
window.isSecureContext
```

## Privacy & Security

- Notifications require explicit user permission
- No notification content is stored or transmitted
- Notifications are purely local to the user's device
- Users can disable notifications at any time via the bell icon

## Browser Notification Settings URLs

- **Chrome**: `chrome://settings/content/notifications`
- **Edge**: `edge://settings/content/notifications`
- **Firefox**: `about:preferences#privacy` (scroll to Permissions)
- **Safari**: Safari → Settings → Websites → Notifications

## For Developers

### Adding Notifications to New Agents

```typescript
// In your agent's onFinish callback:
import { showAgentCompletionNotification } from '@/lib/utils/browser-notifications';

onFinish: (message) => {
  if (notificationsEnabled && !isPageVisible()) {
    showAgentCompletionNotification('your-agent-name');
  }
}
```

### Custom Notifications

```typescript
import { showNotification } from '@/lib/utils/browser-notifications';

showNotification({
  title: 'Custom Title',
  body: 'Custom message',
  requireInteraction: true, // Stays until dismissed
  tag: 'unique-tag', // Replaces existing notification with same tag
});
``` 