'use client';

import Link from 'next/link';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { BarChart3, BookOpen, Headphones, PenTool, Mic, Layers, Sparkles } from 'lucide-react';

const SKILL_ITEMS = [
  { label: 'Reading', href: '/reading', icon: BookOpen },
  { label: 'Listening', href: '/listening', icon: Headphones },
  { label: 'Writing', href: '/writing', icon: PenTool },
  { label: 'Speaking', href: '/speaking', icon: Mic },
];

const RESOURCE_ITEMS = [
  { label: 'Library', href: '/library', icon: Layers },
  { label: 'Flashcards', href: '/flashcards', icon: Sparkles },
];

export function AppSidebar() {
  return (
    <Sidebar side="left" collapsible="icon" resizable={false}>
      <SidebarContent className="pt-4 pr-2 group-data-[collapsible=icon]:p-2">
        <SidebarGroup>
          <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-0">
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard">
                <Link href="/dashboard">
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-0">
            {RESOURCE_ITEMS.map(({ label, href, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild tooltip={label}>
                  <Link href={href}>
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Skills</SidebarGroupLabel>
          <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-0">
            {SKILL_ITEMS.map(({ label, href, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild tooltip={label}>
                  <Link href={href}>
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 mb-2 group-data-[collapsible=icon]:p-0">
        {/* Footer content can go here if needed */}
      </SidebarFooter>
    </Sidebar>
  );
}
