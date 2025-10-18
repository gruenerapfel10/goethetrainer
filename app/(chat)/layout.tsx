import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { SearchModalProvider } from '@/components/search-modal-provider';
import { FloatingWindowLayout } from '@/components/floating-window-layout';

import { auth } from '../(auth)/auth';
import Script from 'next/script';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <div className="min-h-screen bg-background">
        <SidebarProvider defaultOpen={!isCollapsed}>
          <SearchModalProvider>
            <AppSidebar user={session?.user} />
            <SidebarInset>
              <FloatingWindowLayout>
                {children}
              </FloatingWindowLayout>
            </SidebarInset>
          </SearchModalProvider>
        </SidebarProvider>
      </div>
    </>
  );
}
