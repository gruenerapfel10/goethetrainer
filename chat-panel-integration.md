# Chat Panel Integration Guide

## Overview

The Chat Panel is a sliding panel component that mirrors the functionality of your app sidebar but appears on the right side of the screen. It contains a full chat interface and supports hover-to-open, manual toggle, and keyboard shortcuts.

## Quick Start

### 1. Basic Setup

Wrap your app with the `ChatPanelProvider`:

```tsx
import { ChatPanelProvider } from '@/components/chat-panel';

export default function RootLayout({ children }) {
  return (
    <ChatPanelProvider defaultOpen={false}>
      {children}
    </ChatPanelProvider>
  );
}
```

### 2. Add the Chat Panel

Add the `ChatPanel` component at the same level as your main content:

```tsx
import { ChatPanel } from '@/components/chat-panel';

export default function Layout() {
  return (
    <>
      <main>Your content</main>
      <ChatPanel
        chatId="main-chat"
        initialMessages={[]}
        selectedChatModel="gpt-4o-mini"
        selectedVisibilityType="private"
        isReadonly={false}
        isAdmin={false}
      />
    </>
  );
}
```

### 3. Add a Toggle Button

Add a trigger button to open/close the chat panel:

```tsx
import { ChatPanelTrigger } from '@/components/chat-panel';

export function Header() {
  return (
    <header>
      <ChatPanelTrigger>
        Open Chat
      </ChatPanelTrigger>
    </header>
  );
}
```

## Features

### Keyboard Shortcut
- Press `Ctrl/Cmd + K` to toggle the chat panel

### Manual Toggle
- Click the trigger button
- Click the rail on the side of the panel

### Responsive Design
- **Desktop**: Sliding panel with animations
- **Mobile**: Full-screen sheet that slides from the right

## Using with Sidebar

The chat panel works seamlessly with your existing sidebar:

```tsx
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChatPanelProvider, ChatPanel, ChatPanelInset } from '@/components/chat-panel';
import { AppSidebar } from '@/components/app-sidebar';

export default function Layout() {
  return (
    <SidebarProvider>
      <ChatPanelProvider>
        <div className="flex">
          <AppSidebar />
          <ChatPanelInset>
            <main>Your content</main>
          </ChatPanelInset>
          <ChatPanel />
        </div>
      </ChatPanelProvider>
    </SidebarProvider>
  );
}
```

## Accessing Panel State

Use the `useChatPanel` hook to access panel state programmatically:

```tsx
import { useChatPanel } from '@/components/chat-panel';

function MyComponent() {
  const { state, toggleChatPanel, setOpen } = useChatPanel();
  
  return (
    <div>
      <p>Panel is: {state}</p>
      <button onClick={toggleChatPanel}>Toggle</button>
      <button onClick={() => setOpen(true)}>Open</button>
      <button onClick={() => setOpen(false)}>Close</button>
    </div>
  );
}
```

## Customization

### Panel Width
You can customize the panel width using CSS variables:

```css
:root {
  --chat-panel-width: 24rem;
  --chat-panel-width-icon: 3rem;
}
```

### Chat Props
All props from the `Chat` component are supported:

- `chatId`: Unique identifier for the chat
- `initialMessages`: Array of initial messages
- `selectedChatModel`: Model to use (e.g., "gpt-4o-mini")
- `selectedVisibilityType`: "private" | "public"
- `isReadonly`: Whether the chat is read-only
- `isAdmin`: Whether the user is an admin
- `chat`: Optional chat metadata

## Complete Example

See `components/chat-panel-example.tsx` for a complete working example.