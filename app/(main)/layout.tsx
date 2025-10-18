import { auth } from '../(auth)/auth';
import { AppSidebar } from '@/components/app-sidebar';
import { AppRightbar } from '@/components/app-rightbar';
import { AppNavbar } from '@/components/app-navbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { RightSidebarProvider } from '@/lib/right-sidebar-context';
import { KeyboardShortcutHandler } from '@/components/keyboard-shortcut-handler';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <RightSidebarProvider>
      <SidebarProvider className="flex flex-col h-screen">
        <KeyboardShortcutHandler />
        <AppNavbar />
        <div className="flex-1 min-h-0 bg-sidebar flex">
          <AppSidebar user={session?.user} />
          <SidebarInset className="!bg-sidebar flex flex-col flex-1 min-h-0 p-2">
            <div className="flex-1 bg-background border border-border rounded-lg p-4 min-h-0 overflow-auto">
              {children}
            </div>
          </SidebarInset>
          <AppRightbar />
        </div>
      </SidebarProvider>
    </RightSidebarProvider>
  );
}
