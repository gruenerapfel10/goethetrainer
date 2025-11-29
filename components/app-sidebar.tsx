'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LocaleSwitcherSelect from './language-switcher';
import { NavbarThemeToggle } from './navbar-theme-toggle';
import {
  BarChart3,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  Layers,
  Sparkles,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupabaseSession } from '@/lib/supabase/use-session';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const CORE_ITEMS = [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }];
const RESOURCE_ITEMS = [
  { label: 'Library', href: '/library', icon: Layers },
  { label: 'Flashcards', href: '/flashcards', icon: Sparkles },
];
const SKILL_ITEMS = [
  { label: 'Reading', href: '/reading', icon: BookOpen },
  { label: 'Listening', href: '/listening', icon: Headphones },
  { label: 'Writing', href: '/writing', icon: PenTool },
  { label: 'Speaking', href: '/speaking', icon: Mic },
];

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const isExpanded = isMobile ? true : state === 'expanded';
  const { user } = useSupabaseSession();
  const userEmail = user?.email ?? '';

  useEffect(() => setMounted(true), []);

  const handleSignOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  if (!mounted) return null;

  const buttonClasses = (expanded: boolean) =>
    cn(
      'group relative h-9 py-1.5 text-foreground rounded-lg transition-colors',
      expanded ? 'px-2 justify-start' : 'px-1 justify-center',
      'hover:bg-primary hover:text-primary-foreground'
    );

  const renderMenu = (items: typeof CORE_ITEMS, label?: string) => (
    <SidebarGroup className="px-2 py-3 gap-0">
      {label ? (
        <SidebarGroupLabel className="text-foreground/60 text-xs font-semibold h-6">
          {label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarMenu className="gap-0">
        {items.map(({ label: text, href, icon: Icon }) => (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={text}
              className={buttonClasses(isExpanded)}
            >
              <Link href={href} className="flex items-center gap-3">
                <Icon className="h-4 w-4 stroke-[2] text-foreground group-hover:text-primary-foreground flex-shrink-0" />
                {isExpanded && (
                  <span className="font-medium text-sm whitespace-nowrap">
                    {text}
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );

  return (
    <Sidebar
      side="left"
      collapsible="icon"
      resizable={false}
      collapsedWidth={44}
      className="bg-background dark:bg-[hsl(var(--content-color))] overflow-hidden"
      suppressHydrationWarning
    >
      <SidebarContent
        className="p-0 bg-background dark:bg-[hsl(var(--content-color))] overflow-hidden"
        style={{ gap: '0' }}
      >
        {renderMenu(CORE_ITEMS)}
        {renderMenu(RESOURCE_ITEMS, 'Resources')}
        {renderMenu(SKILL_ITEMS, 'Skills')}
      </SidebarContent>
      <SidebarFooter className="mt-auto px-2 py-3 gap-2 bg-background dark:bg-[hsl(var(--content-color))]">
        <div className="flex flex-col gap-2">
          <LocaleSwitcherSelect expanded={isExpanded} />
          <NavbarThemeToggle expanded={isExpanded} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                'relative h-9 py-1.5 text-foreground rounded-lg',
                isExpanded ? 'px-2 justify-start' : 'px-1 justify-center'
              )}
              title={userEmail}
            >
              <div className="h-6 w-6 rounded-full overflow-hidden border border-sidebar-accent flex-shrink-0">
                <Image
                  src="/magicpattern-mesh-gradient-1763828403935.svg"
                  alt="User Avatar"
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                />
              </div>
              {isExpanded && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate text-foreground text-left">{userEmail}</div>
                </div>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56 rounded-xl">
            <div className="px-2 py-3 border-b border-border">
              <div className="text-xs font-medium text-muted-foreground">Account</div>
              <div className="text-sm font-medium text-foreground truncate mt-1">{userEmail}</div>
            </div>
            <DropdownMenuItem
              onClick={() => void handleSignOut()}
              className="flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
