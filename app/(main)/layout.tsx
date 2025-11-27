import { auth } from '../(auth)/auth';
import { AppSidebar } from '@/components/app-sidebar';
import { AppRightbar } from '@/components/app-rightbar';
import { AppNavbar } from '@/components/app-navbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { RightSidebarProvider } from '@/lib/right-sidebar-context';
import { LearningSessionProvider } from '@/lib/sessions/learning-session-context';
import { KeyboardShortcutHandler } from '@/components/keyboard-shortcut-handler';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth();

  return (
    <LearningSessionProvider>
      <RightSidebarProvider>
        <SidebarProvider
          defaultOpen={true}
          className="flex flex-col h-screen overflow-hidden bg-[hsl(var(--content-color))]"
        >
          <KeyboardShortcutHandler />
          <AppNavbar />
          <div className="flex-1 min-h-0 flex bg-[hsl(var(--content-color))] overflow-hidden">
            <AppSidebar />
            <SidebarInset className="relative flex flex-col flex-1 min-h-0 p-0 pb-2 pr-2 bg-[hsl(var(--content-color))] overflow-auto">
              <div className="relative flex-1 min-h-0 overflow-auto bg-[hsl(var(--layout-color))] rounded-none border-0">
                {/* Top vignette */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 h-16 z-20"
                  style={{
                    top: 'var(--page-header-offset, 0px)',
                    background: 'linear-gradient(to bottom, hsl(var(--content-color)) 0%, transparent 70%)',
                    opacity: 1,
                  }}
                />
                {/* Bottom vignette */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-16 z-20"
                  style={{
                    background: 'linear-gradient(to top, hsl(var(--content-color)) 0%, transparent 70%)',
                    opacity: 1,
                  }}
                />
                {children}
              </div>
            </SidebarInset>
            <AppRightbar />
          </div>
        </SidebarProvider>
      </RightSidebarProvider>
    </LearningSessionProvider>
  );
}
