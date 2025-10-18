'use client';

import type { User } from 'next-auth';
import Link from 'next/link';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { BarChart3, BookOpen, Headphones, PenTool, Mic } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { label: 'Reading', href: '/reading', icon: BookOpen },
  { label: 'Listening', href: '/listening', icon: Headphones },
  { label: 'Writing', href: '/writing', icon: PenTool },
  { label: 'Speaking', href: '/speaking', icon: Mic },
];

export function AppSidebar({ user }: { user: User | undefined }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-4">
        <SidebarMenu className="gap-2">
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild>
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 mb-2">
        {user && <SidebarUserNav user={user} />}
      </SidebarFooter>
    </Sidebar>
  );
}
