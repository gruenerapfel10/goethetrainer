'use client';

import { NavbarThemeToggle } from './navbar-theme-toggle';
import LocaleSwitcherSelect from './language-switcher';
import { SidebarToggle, RightSidebarToggle } from './sidebar-toggle';
import { AppBreadcrumb } from './app-breadcrumb';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AppNavbar() {
  const userEmail = 'user@example.com'; // TODO: Get actual user from auth context

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-sidebar-accent cursor-pointer hover:border-sidebar-accent/80 transition-colors">
              <Image
                src={`https://avatar.vercel.sh/${userEmail}`}
                alt="User Avatar"
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
            <div className="px-2 py-1.5 text-sm font-medium">
              {userEmail}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
