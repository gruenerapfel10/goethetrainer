'use client';

import { SidebarToggle, RightSidebarToggle } from './sidebar-toggle';
import { AppBreadcrumb } from './app-breadcrumb';
import Image from 'next/image';

export function AppNavbar() {
  return (
    <nav className="bg-background text-foreground px-6 py-2 flex items-center justify-between flex-shrink-0 h-12 border-0 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Goethe Logo"
            width={32}
            height={32}
            className="h-8 w-8 object-contain dark:hidden"
          />
          <Image
            src="/logo_dark.png"
            alt="Goethe Logo"
            width={32}
            height={32}
            className="h-8 w-8 object-contain hidden dark:block"
          />
          <div className="text-2xl font-bold tracking-tight">Faust</div>
          <SidebarToggle />
        </div>
        <AppBreadcrumb />
      </div>
      <div className="flex items-center gap-2">
        <RightSidebarToggle />
      </div>
    </nav>
  );
}
