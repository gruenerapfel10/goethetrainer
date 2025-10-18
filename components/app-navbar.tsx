'use client';

import { NavbarThemeToggle } from './navbar-theme-toggle';
import LocaleSwitcherSelect from './language-switcher';
import { RightSidebarToggle } from './right-sidebar-toggle';
import { SidebarToggle } from './sidebar-toggle';

export function AppNavbar() {
  return (
    <nav className="bg-sidebar text-sidebar-foreground px-6 py-3 flex items-center justify-between flex-shrink-0 h-14 border-0">
      <div className="text-2xl font-bold tracking-tight">Goethe</div>
      <div className="flex items-center gap-2">
        <SidebarToggle />
        <LocaleSwitcherSelect />
        <NavbarThemeToggle />
        <RightSidebarToggle />
      </div>
    </nav>
  );
}
