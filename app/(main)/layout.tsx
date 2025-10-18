import { auth } from '../(auth)/auth';
import { AppSidebar } from '@/components/app-sidebar';
import { AppRightbar } from '@/components/app-rightbar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <nav className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="text-lg font-semibold">Goethe Trainer</div>
        <div className="flex items-center gap-4">
          <button className="hover:bg-slate-700 px-3 py-2 rounded">Profile</button>
          <button className="hover:bg-slate-700 px-3 py-2 rounded">Settings</button>
        </div>
      </nav>
      <SidebarProvider>
        <AppSidebar user={session?.user} />
        <SidebarInset className="bg-red-500 flex flex-col flex-1 min-h-0">
          <div className="flex-1 p-4 min-h-0 overflow-auto">
            <div className="flex-1 bg-blue-500 rounded-lg p-4 h-full">
              {children}
            </div>
          </div>
        </SidebarInset>
        <AppRightbar />
      </SidebarProvider>
    </div>
  );
}
