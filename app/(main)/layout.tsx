import { auth } from '../(auth)/auth';
import { AppSidebar } from '@/components/app-sidebar';
import { AppRightbar } from '@/components/app-rightbar';
import { AppNavbar } from '@/components/app-navbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex flex-col h-screen">
      <AppNavbar />
      <SidebarProvider className="flex-1 min-h-0 bg-sidebar">
        <AppSidebar user={session?.user} />
        <SidebarInset className="!bg-sidebar flex flex-col flex-1 min-h-0 p-2">
          <div className="flex-1 bg-background border border-border rounded-lg p-4 min-h-0 overflow-auto">
            {children}
          </div>
        </SidebarInset>
        <AppRightbar />
      </SidebarProvider>
    </div>
  );
}
