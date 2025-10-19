'use client';

import { NavbarThemeToggle } from './navbar-theme-toggle';
import LocaleSwitcherSelect from './language-switcher';
import { SidebarToggle, RightSidebarToggle } from './sidebar-toggle';
import { AppBreadcrumb } from './app-breadcrumb';

export function AppNavbar() {
  return (
    <nav className="bg-sidebar text-sidebar-foreground px-6 py-2 flex items-center justify-between flex-shrink-0 h-12 border-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold tracking-tight">Goethe</div>
          <SidebarToggle />
        </div>
        <AppBreadcrumb />
      </div>
      <div className="flex items-center gap-2">
        <LocaleSwitcherSelect />
        <NavbarThemeToggle />
        <RightSidebarToggle />
      </div>
    </nav>
  );
}
