'use client';

import type { User } from '@/types/next-auth';
import { useRouter } from 'next/navigation';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlusIcon, LayoutDashboardIcon, ShieldIcon, GraduationCapIcon } from './icons';
import { Rocket } from 'lucide-react';
import { LogoComponent } from './logo-component';
import LanguageSwitcher from './language-switcher';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

// Logo Header Component
function LogoHeader() {
  const { state } = useSidebar();
  
  return (
    <SidebarMenu className={state === 'expanded' ? 'px-2' : 'px-0'}>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/" className="flex items-center justify-center">
            <LogoComponent collapsed={state === 'collapsed'} />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// New Chat Button Component
function NewChatButton() {
  const router = useRouter();
  const t = useTranslations();
  const { setOpenMobile, state } = useSidebar();

  return (
    <SidebarMenu className={state === 'expanded' ? 'px-0' : 'px-0'}>
      <SidebarMenuItem>
        <SidebarMenuButton
          variant="outline"
          tooltip={t('chat.newChat')}
          onClick={() => {
            router.push('/');
            setOpenMobile(false);
          }}
          className={cn(
            "w-full h-9 bg-[#0A0C10] border border-[#2A2F3C] border-[0px] text-white hover:text-white rounded-xl hover:bg-[#12151C] hover:border-[#3A4150] transition-colors duration-200 flex items-center gap-2.5",
            state === 'expanded' ? 'justify-center' : 'justify-center !p-0 aspect-square'
          )}
        >
          <PlusIcon className="h-4 w-4" />
          {state === 'expanded' && (
            <span className="text-sm font-medium">{t('chat.newChat')}</span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// Admin Navigation Component
function AdminNav({ user }: { user: User | undefined }) {
  const t = useTranslations();
  const { setOpenMobile, state } = useSidebar();

  // TODO: Implement Firebase custom claims for admin check
  // if (!user?.isAdmin) return null;
  return null; // Temporarily disabled until admin roles are implemented

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip={t('chat.adminPortal')} asChild>
          <Link 
            href="/admin" 
            onClick={() => setOpenMobile(false)}
            className={cn(
              "flex items-center gap-2 text-sm font-medium w-full px-2 py-2",
              "hover:bg-sidebar-accent/50 rounded-md transition-colors"
            )}
          >
            <ShieldIcon className="h-4 w-4" />
            <span>{t('chat.adminPortal')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// Dashboard Navigation Component
function DashboardNav({ user }: { user: User | undefined }) {
  const t = useTranslations();
  const { setOpenMobile, state } = useSidebar();

  // Auth removed - always show dashboard
  // if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip={t('chat.dashboard')} asChild>
          <Link 
            href="/dashboard" 
            onClick={() => setOpenMobile(false)}
            className={cn(
              "flex items-center gap-2 text-sm font-medium w-full px-2 py-2",
              "hover:bg-sidebar-accent/50 rounded-md transition-colors"
            )}
          >
            <LayoutDashboardIcon className="h-4 w-4" />
            <span>{t('chat.dashboard')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// Universities Navigation Component
function UniversitiesNav({ user }: { user: User | undefined }) {
  const { setOpenMobile, state } = useSidebar();

  // Auth removed - always show universities
  // if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Universities" asChild>
          <Link 
            href="/universities" 
            onClick={() => setOpenMobile(false)}
            className={cn(
              "flex items-center gap-2 text-sm font-medium w-full px-2 py-2",
              "hover:bg-sidebar-accent/50 rounded-md transition-colors"
            )}
          >
            <GraduationCapIcon className="h-4 w-4" />
            <span>Universities</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// Language Switcher Component
function LanguageNav() {
  const { state } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="">
          <LanguageSwitcher />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}


export function AppSidebar({ user }: { user: User | undefined }) {
  const { state } = useSidebar();
  
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <LogoHeader />
        <div className="space-y-2">
          <NewChatButton />
          <div className="space-y-1">
            <DashboardNav user={user} />
            <UniversitiesNav user={user} />
            <LanguageNav />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
      </SidebarContent>
      <SidebarFooter>
        {/* Upgrade Button */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            >
              <Link href="/offer" className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                {state === 'expanded' && (
                  <span className="font-medium">Upgrade to Navigator</span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* Auth removed - always show user nav with dummy user */}
        <SidebarUserNav user={{ 
          id: 'anonymous', 
          email: 'anonymous@example.com', 
          name: 'Anonymous User',
          image: null 
        }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
