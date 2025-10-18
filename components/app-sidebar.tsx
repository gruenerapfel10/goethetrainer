'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import { SidebarHistory } from '@/components/sidebar-history';
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
import { PlusIcon, LayoutDashboardIcon, ShieldIcon } from './icons';
import LanguageSwitcher from './language-switcher';
import { cn } from '@/lib/utils';
import { useState, } from 'react';
import { useWindowSize } from 'usehooks-ts';
import { SidebarSearch } from './sidebar-search';
import { useSearchModal } from './search-modal-provider';


// New Chat Button Component
function NewChatButton() {
  const router = useRouter();
  const t = useTranslations();
  const { setOpenMobile, state } = useSidebar();
  const { width } = useWindowSize();
  
  // Show text on smaller screens or when sidebar is expanded
  const isMobile = width < 768;
  const showText = state === 'expanded' || width < 1024;

  return (
    <SidebarMenu className={state === 'expanded' ? 'px-0' : 'px-0'}>
      <SidebarMenuItem>
        <SidebarMenuButton
          variant="outline"
          tooltip={!showText ? t('chat.newChat') : undefined}
          onClick={() => {
            router.push('/');
            setOpenMobile(false);
          }}
          className={cn(
            "w-full h-9 bg-[#0A0C10] border border-[#2A2F3C] border-[0px] text-white hover:text-white rounded-xl hover:bg-[#12151C] hover:border-[#3A4150] transition-colors duration-200 flex items-center gap-2.5",
            showText ? 'justify-center' : 'justify-center !p-0 aspect-square'
          )}
        >
          <PlusIcon className="h-4 w-4" />
          {showText && (
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

  if (!user?.isAdmin) return null;

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

  if (!user?.isAdmin) return null;

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
  const { state, setOpenMobile } = useSidebar();
  const { width } = useWindowSize();
  const { openSearchModal } = useSearchModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultCount, setSearchResultCount] = useState<number | undefined>();
  
  const handleOpenSearchModal = () => {
    setOpenMobile(false); // Close sidebar on mobile
    openSearchModal();
  };
  
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="space-y-2">
          <NewChatButton />
          <SidebarSearch 
            value={searchQuery} 
            onChange={setSearchQuery}
            resultCount={searchQuery ? searchResultCount : undefined}
            onOpenModal={handleOpenSearchModal}
          />
          <div className="space-y-1">
            <AdminNav user={user} />
            <DashboardNav user={user} />
            <LanguageNav />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {(state === 'expanded' || width < 1024) && (
          <SidebarHistory 
            user={user} 
            searchQuery={searchQuery}
            onSearchResultsChange={setSearchResultCount}
          />
        )}
      </SidebarContent>
      <SidebarFooter className="p-2 mb-2">
        {user && <SidebarUserNav user={user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
