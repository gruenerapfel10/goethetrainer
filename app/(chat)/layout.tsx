import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ArtifactProvider } from '@/components/artifact-provider';
import { ChatPanelProvider, ChatPanel, ChatPanelInset } from '@/components/chat-panel';

// Auth removed - no authentication needed
// import { getServerSession } from '@/lib/firebase/auth-helpers';
import { generateUUID } from '@/lib/utils';
import Script from 'next/script';

export const dynamic = 'force-dynamic';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth removed - no authentication needed
  const session = null;
  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';
  const isChatPanelCollapsed = cookieStore.get('chat_panel_state')?.value !== 'true';

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <SidebarProvider defaultOpen={!isCollapsed}>
        <ChatPanelProvider defaultOpen={!isChatPanelCollapsed}>
          <ArtifactProvider>
            <div className="flex w-full">
              <AppSidebar user={null} />
              <SidebarInset>
                <ChatPanelInset>
                  {children}
                </ChatPanelInset>
              </SidebarInset>
              <ChatPanel
                chatId="550e8400-e29b-41d4-a716-446655440000"
                initialMessages={[]}
                selectedChatModel="gemini-2.5-flash"
                selectedVisibilityType="public"
                isReadonly={false}
                isAdmin={false}
                collapsible="offcanvas"
              />
            </div>
          </ArtifactProvider>
        </ChatPanelProvider>
      </SidebarProvider>
    </>
  );
}