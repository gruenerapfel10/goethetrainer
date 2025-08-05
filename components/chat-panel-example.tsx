'use client';

import { ChatPanelProvider, ChatPanel, ChatPanelTrigger, ChatPanelInset } from '@/components/chat-panel';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import type { User } from '@/types/next-auth';

interface ExampleLayoutProps {
  user?: User;
  children: React.ReactNode;
}

export function ExampleLayout({ user, children }: ExampleLayoutProps) {
  return (
    <SidebarProvider>
      <ChatPanelProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full">
          {/* Left sidebar */}
          <AppSidebar user={user} />
          
          {/* Main content area */}
          <ChatPanelInset>
            <div className="flex-1">
              <header className="border-b p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Your App</h1>
                <div className="flex gap-2">
                  {/* Chat panel trigger button */}
                  <ChatPanelTrigger className="flex items-center gap-2">
                    <span className="hidden md:inline">Open Chat</span>
                  </ChatPanelTrigger>
                </div>
              </header>
              
              <main className="p-4">
                {children}
              </main>
            </div>
          </ChatPanelInset>
          
          {/* Right chat panel */}
          <ChatPanel
            chatId="main-chat"
            initialMessages={[]}
            selectedChatModel="gpt-4o-mini"
            selectedVisibilityType="private"
            isReadonly={false}
            isAdmin={false}
          />
        </div>
      </ChatPanelProvider>
    </SidebarProvider>
  );
}

// Example of using the chat panel hook in a component
export function ChatPanelControls() {
  const { state, toggleChatPanel } = useChatPanel();
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Chat Panel Controls</h3>
      <p className="mb-4">Chat panel is currently: <strong>{state}</strong></p>
      <button
        onClick={toggleChatPanel}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Toggle Chat Panel
      </button>
      <p className="mt-2 text-sm text-gray-600">
        You can also press <kbd>Ctrl/Cmd + /</kbd> to toggle the chat panel
      </p>
    </div>
  );
}

// Example of a full page implementation
export default function ExamplePage() {
  const user = undefined; // Replace with actual user data
  
  return (
    <ExampleLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold">Welcome to Your App</h2>
        
        <div className="prose">
          <p>
            This example shows how to use the chat panel component alongside the regular sidebar.
            The chat panel slides out from the right side and can be toggled in several ways:
          </p>
          <ul>
            <li>Click the "Open Chat" button in the header</li>
            <li>Use the keyboard shortcut Ctrl/Cmd + /</li>
            <li>Hover over the right edge of the screen (on desktop)</li>
            <li>Click the rail on the right side of the chat panel</li>
          </ul>
        </div>
        
        <ChatPanelControls />
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-3">Features</h3>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Mirrors sidebar behavior on the right side</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Full chat functionality in a sliding panel</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Smooth Framer Motion animations</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Responsive design (desktop panel, mobile sheet)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Hover zones for auto-expand</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Cookie persistence for panel state</span>
            </li>
          </ul>
        </div>
      </div>
    </ExampleLayout>
  );
}