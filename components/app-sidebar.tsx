'use client';

import type { User } from 'next-auth';
import Link from 'next/link';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { BarChart3, BookOpen, Headphones, PenTool, Mic } from 'lucide-react';

const SKILL_ITEMS = [
  { label: 'Reading', href: '/reading', icon: BookOpen },
  { label: 'Listening', href: '/listening', icon: Headphones },
  { label: 'Writing', href: '/writing', icon: PenTool },
  { label: 'Speaking', href: '/speaking', icon: Mic },
];

export function AppSidebar({ user }: { user: User | undefined }) {
  return (
    <Sidebar collapsible="icon" resizable={true}>
      <SidebarContent className="pt-4 pr-2">
        <SidebarGroup>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Skills</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {SKILL_ITEMS.map(({ label, href, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild>
                  <Link href={href} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 mb-2">
        {user && <SidebarUserNav user={user} />}
      </SidebarFooter>
    </Sidebar>
  );
}
