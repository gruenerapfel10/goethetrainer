import { auth } from '../(auth)/auth';
import { AppSidebar } from '@/components/app-sidebar';
import { AppRightbar } from '@/components/app-rightbar';
import { AppNavbar } from '@/components/app-navbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { RightSidebarProvider } from '@/lib/right-sidebar-context';
import { LearningSessionProviderWrapper } from '@/components/learning-session-provider-wrapper';
import { KeyboardShortcutHandler } from '@/components/keyboard-shortcut-handler';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth();

  return (
    <LearningSessionProviderWrapper>
      <RightSidebarProvider>
        <SidebarProvider
          defaultOpen={true}
          className="flex flex-col h-screen overflow-hidden bg-background dark:bg-[hsl(var(--content-color))]"
        >
          <KeyboardShortcutHandler />
          <AppNavbar />
          <div className="flex-1 min-h-0 flex bg-background dark:bg-[hsl(var(--content-color))] overflow-hidden relative">
            <AppSidebar />
                    {/* Top vignette */}
              <div
                aria-hidden
                className="pointer-events-none absolute top-0 left-0 right-0 z-20"
                style={{
                  height: '64px',
                  background: 'linear-gradient(to bottom, hsl(var(--content-color)) 0%, transparent 70%)',
                  opacity: 1,
                }}
              />
              {/* Bottom vignette */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-0 right-0 z-20"
                style={{
                  height: '64px',
                  background: 'linear-gradient(to top, hsl(var(--content-color)) 0%, transparent 70%)',
                  opacity: 1,
                }}
              />
            <SidebarInset className="flex flex-col flex-1 min-h-0 p-0 pb-2 pr-2 bg-background dark:bg-[hsl(var(--content-color))] overflow-auto">
              <div className="flex-1 min-h-0 bg-[hsl(var(--layout-color))] rounded-none border-0">
                {children}
              </div>
            </SidebarInset>
            <AppRightbar />
          </div>
        </SidebarProvider>
      </RightSidebarProvider>
    </LearningSessionProviderWrapper>
  );
}
