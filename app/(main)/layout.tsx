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
      <SidebarProvider className="flex-1 min-h-0">
        <AppSidebar user={session?.user} />
        <SidebarInset className="bg-red-500 flex flex-col flex-1 min-h-0 p-4">
          <div className="flex-1 bg-blue-500 rounded-lg p-4 min-h-0 overflow-auto">
            {children}
          </div>
        </SidebarInset>
        <AppRightbar />
      </SidebarProvider>
    </div>
  );
}
